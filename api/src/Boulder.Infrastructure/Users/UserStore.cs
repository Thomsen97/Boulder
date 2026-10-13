using Boulder.Application.Users;
using Boulder.Domain.Users;
using Boulder.Infrastructure.Persistence;
using Boulder.Infrastructure.Persistence.Configurations;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Boulder.Infrastructure.Users;

internal sealed class UserStore(BoulderDbContext db) : IUserStore
{
    public Task<User?> FindByAuthSubjectAsync(string authSubject, CancellationToken ct) =>
        db.Set<User>().FirstOrDefaultAsync(u => u.AuthSubject == authSubject, ct);

    public Task<User?> FindByUsernameAsync(string normalizedUsername, CancellationToken ct) =>
        db.Set<User>().FirstOrDefaultAsync(
            u => u.Username == normalizedUsername && u.Status != UserStatus.Deleted, ct);

    public Task<bool> IsUsernameTakenAsync(string normalizedUsername, Guid? exceptUserId, CancellationToken ct) =>
        db.Set<User>().AnyAsync(
            u => u.Username == normalizedUsername && u.Status != UserStatus.Deleted && u.Id != exceptUserId, ct);

    public void Add(User user) => db.Set<User>().Add(user);

    public async Task SaveChangesAsync(CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException e) when (e.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation
        } pg)
        {
            // Leave the context usable for the rest of the request.
            db.ChangeTracker.Clear();
            throw pg.ConstraintName switch
            {
                UserConfiguration.UsernameIndex => new UserConflictException(UserConflict.Username),
                UserConfiguration.AuthSubjectIndex => new UserConflictException(UserConflict.AuthSubject),
                _ => e
            };
        }
    }
}
