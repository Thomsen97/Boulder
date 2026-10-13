using Boulder.Domain.Users;

namespace Boulder.Application.Users;

public enum UserConflict
{
    Username,
    AuthSubject
}

public sealed class UserConflictException(UserConflict conflict) : Exception($"Unique constraint violated: {conflict}.")
{
    public UserConflict Conflict { get; } = conflict;
}

public interface IUserStore
{
    Task<User?> FindByAuthSubjectAsync(string authSubject, CancellationToken ct);

    /// <summary>Finds a user that is not deleted. <paramref name="normalizedUsername"/> must be normalized.</summary>
    Task<User?> FindByUsernameAsync(string normalizedUsername, CancellationToken ct);

    Task<bool> IsUsernameTakenAsync(string normalizedUsername, Guid? exceptUserId, CancellationToken ct);

    void Add(User user);

    /// <exception cref="UserConflictException">A unique index rejected the change.</exception>
    Task SaveChangesAsync(CancellationToken ct);
}
