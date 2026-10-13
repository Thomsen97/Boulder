using Boulder.Domain.Users;

namespace Boulder.Application.Visibility;

public enum ProfileAccess
{
    /// <summary>The viewer must not learn that the profile exists (404).</summary>
    None,

    /// <summary>Avatar, names, counts and the private flag only (PROF-5).</summary>
    HeaderOnly,

    /// <summary>Header plus posts, stats and lists.</summary>
    Full
}

/// <summary>
/// SPEC section 5 in one place (architecture 3.4). Phase 3 only has profile access; the follow and block rules
/// arrive in phase 5 and the post and ascent queries in phase 8.
/// </summary>
public interface IVisibility
{
    Task<ProfileAccess> GetProfileAccessAsync(Guid viewerId, User target, CancellationToken ct);
}
