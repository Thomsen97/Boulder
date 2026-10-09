using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Boulder.Infrastructure.Persistence;

// Used only by dotnet-ef tooling (migrations, scaffolding).
public class BoulderDbContextFactory : IDesignTimeDbContextFactory<BoulderDbContext>
{
    public BoulderDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<BoulderDbContext>()
            .UseNpgsql(
                "Host=localhost;Port=5432;Database=boulder_dev;Username=boulder;Password=boulder",
                o => o.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery))
            .Options;

        return new BoulderDbContext(options);
    }
}
