using Boulder.Application.Common;
using Boulder.Domain.Users;

namespace Boulder.Application.Users;

public sealed class UpdateMeHandler(ICurrentUser current, IUserStore users, TimeProvider time)
{
    public async Task<Result<MeDto>> HandleAsync(UpdateMeRequest request, CancellationToken ct)
    {
        var user = current.User ?? throw new InvalidOperationException("The account gate guarantees an onboarded user.");
        var errors = new FieldErrors();

        string? displayName = null;
        if (request.DisplayName is not null)
        {
            displayName = request.DisplayName.Trim();
            if (displayName.Length is 0 or > User.DisplayNameMaxLength)
            {
                errors.Add("displayName", "length");
            }
        }

        string? bio = null;
        if (request.Bio is not null)
        {
            bio = request.Bio.Trim();
            if (bio.Length > User.BioMaxLength)
            {
                errors.Add("bio", "length");
            }
        }

        var spoilerMode = user.SpoilerMode;
        if (request.SpoilerMode is not null && !UserEnumText.TryParseSpoilerMode(request.SpoilerMode, out spoilerMode))
        {
            errors.Add("spoilerMode", "invalid");
        }

        string? newUsername = null;
        if (request.Username is not null)
        {
            var normalized = UsernameRules.Normalize(request.Username);
            var error = UsernameRules.Validate(normalized);
            if (error != UsernameError.None)
            {
                errors.Add("username", error.ToReason());
            }
            else if (normalized != user.Username)
            {
                newUsername = normalized;
            }
        }

        if (errors.Any)
        {
            return errors.ToFailure();
        }

        var now = time.GetUtcNow();
        if (newUsername is not null)
        {
            var next = UsernameRules.NextChangeAt(user.UsernameChangedAt, now);
            if (next is not null)
            {
                return new Failure(FailureKind.UsernameChangeTooSoon, RetryAfter: next);
            }

            if (await users.IsUsernameTakenAsync(newUsername, user.Id, ct))
            {
                return new Failure(FailureKind.UsernameTaken);
            }

            user.Username = newUsername;
            user.UsernameChangedAt = now;
        }

        if (displayName is not null) user.DisplayName = displayName;
        if (bio is not null) user.Bio = bio;
        if (request.IsPrivate is { } isPrivate) user.IsPrivate = isPrivate;
        if (request.ShareAscents is { } shareAscents) user.ShareAscents = shareAscents;
        user.SpoilerMode = spoilerMode;

        try
        {
            await users.SaveChangesAsync(ct);
        }
        catch (UserConflictException)
        {
            return new Failure(FailureKind.UsernameTaken);
        }

        return user.ToMe();
    }
}
