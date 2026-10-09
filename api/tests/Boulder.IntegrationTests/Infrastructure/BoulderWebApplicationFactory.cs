using Boulder.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Hosting;
using Testcontainers.PostgreSql;

namespace Boulder.IntegrationTests.Infrastructure;

public class BoulderWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .Build();

    public string ConnectionString => _postgres.GetConnectionString();

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
    }

    public new async Task DisposeAsync()
    {
        await _postgres.StopAsync();
        await base.DisposeAsync();
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        // Inject the test container connection string so Program.cs can find it
        // before it throws on missing connection string.
        builder.ConfigureHostConfiguration(config =>
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = ConnectionString,
                ["ASPNETCORE_ENVIRONMENT"] = "Test"
            }));

        return base.CreateHost(builder);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");

        builder.ConfigureServices(services =>
        {
            // Replace DbContext with test container connection
            services.RemoveAll<DbContextOptions<BoulderDbContext>>();
            services.AddDbContext<BoulderDbContext>(options =>
                options.UseNpgsql(ConnectionString));

            // Replace Npgsql health check with test container connection
            services.Configure<HealthCheckServiceOptions>(opts =>
            {
                var existing = opts.Registrations.FirstOrDefault(r => r.Name == "npgsql");
                if (existing != null) opts.Registrations.Remove(existing);
            });
            services.AddHealthChecks().AddNpgSql(ConnectionString);

            // Apply migrations
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<BoulderDbContext>();
            db.Database.Migrate();
        });
    }
}
