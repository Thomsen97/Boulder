using Boulder.Application.Visibility;
using Boulder.Domain.Users;

namespace Boulder.Infrastructure.Users;

/// <summary>
/// Profile rules of SPEC 5.2 and PROF-5. Blocks and follows do not exist yet (phase 5), so a private profile
/// shows its header only and a public one shows everything. Accounts that are not active are invisible to others.
/// </summary>
internal sealed class Visibility : IVisibility
{
    public Task<ProfileAccess> GetProfileAccessAsync(Guid viewerId, User target, CancellationToken ct)
    {
        if (viewerId == target.Id)
        {
            return Task.FromResult(ProfileAccess.Full);
        }

        if (target.Status != UserStatus.Active)
        {
            return Task.FromResult(ProfileAccess.None);
        }

        return Task.FromResult(target.IsPrivate ? ProfileAccess.HeaderOnly : ProfileAccess.Full);
    }
}
