using Boulder.Application.Visibility;
using Boulder.Domain.Users;

namespace Boulder.Infrastructure.Users;

/// <summary>
/// Profile rules of SPEC 5.2 and PROF-5. Blocks and follows do not exist yet (phase 5), so a private profile
/// shows its header only and a public one shows everything.
/// </summary>
internal sealed class Visibility : IVisibility
{
    public Task<ProfileAccess> GetProfileAccessAsync(Guid viewerId, User target, CancellationToken ct)
    {
        var access = viewerId == target.Id || !target.IsPrivate ? ProfileAccess.Full : ProfileAccess.HeaderOnly;
        return Task.FromResult(access);
    }
}
