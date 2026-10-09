using Microsoft.EntityFrameworkCore;

namespace Boulder.Infrastructure.Persistence;

public class BoulderDbContext(DbContextOptions<BoulderDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("citext");

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BoulderDbContext).Assembly);
    }
}
