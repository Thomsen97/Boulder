using Boulder.Application.Common;
using Boulder.Application.Visibility;
using Boulder.Domain.Users;

namespace Boulder.Application.Users;

public sealed class GetUserProfileHandler(ICurrentUser current, IUserStore users, IVisibility visibility)
{
    public async Task<Result<UserProfileDto>> HandleAsync(string username, CancellationToken ct)
    {
        var viewer = current.User ?? throw new InvalidOperationException("The account gate guarantees an onboarded user.");
        var target = await users.FindByUsernameAsync(UsernameRules.Normalize(username), ct);

        // Missing, deleted and (for others) suspended accounts look the same: 404, never 403 (SEC-3).
        if (target is null || (target.Id != viewer.Id && target.Status != UserStatus.Active))
        {
            return new Failure(FailureKind.NotFound);
        }

        var access = await visibility.GetProfileAccessAsync(viewer.Id, target, ct);
        if (access == ProfileAccess.None)
        {
            return new Failure(FailureKind.NotFound);
        }

        // Follower counts and follow state arrive with the social graph in phase 5.
        return new UserProfileDto(
            target.Id,
            target.Username,
            target.DisplayName,
            target.Bio,
            AvatarUrl: null,
            target.IsPrivate,
            IsOwn: target.Id == viewer.Id,
            FollowerCount: 0,
            FollowingCount: 0,
            FollowState: "none",
            CanViewContent: access == ProfileAccess.Full);
    }
}
