using System.Net.Http.Headers;
using Boulder.Api.Auth;
using Boulder.Domain.Users;
using Boulder.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Testcontainers.PostgreSql;

namespace Boulder.IntegrationTests.Infrastructure;

public class BoulderWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine")
        .Build();

    public BoulderWebApplicationFactory()
    {
        Jwks = new StubJwksHandler();
        Jwt = new TestJwt(Jwks);
    }

    /// <summary>The JWKS the API downloads; tests add keys to it to rotate signing keys.</summary>
    public StubJwksHandler Jwks { get; }

    public TestJwt Jwt { get; }

    /// <summary>The API's clock; tests move it forward to pass time-based limits.</summary>
    public TestClock Clock { get; } = new();

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BoulderDbContext>();
        await db.Database.MigrateAsync();
    }

    public new async Task DisposeAsync()
    {
        await _postgres.StopAsync();
        await base.DisposeAsync();
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        // ConfigureHostConfiguration runs before any appsettings file, so the
        // test-container string is visible to Program.cs when it reads config.
        // appsettings.Test.json deliberately omits ConnectionStrings:Default so
        // nothing overrides this injection.
        builder.ConfigureHostConfiguration(config =>
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = _postgres.GetConnectionString(),
                ["Supabase:JwksUrl"] = "http://jwks.test/auth/v1/.well-known/jwks.json",
                ["Supabase:Issuer"] = TestJwt.Issuer,
                // Zero so the key rotation test can force a refetch right away.
                ["Supabase:JwksMinRefetchInterval"] = "00:00:00"
            }));
        return base.CreateHost(builder);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");
        builder.ConfigureTestServices(services =>
        {
            services.AddHttpClient(JwksKeyCache.HttpClientName)
                .ConfigurePrimaryHttpMessageHandler(() => Jwks);
            services.AddSingleton<TimeProvider>(Clock);
        });
    }

    /// <summary>A client that sends a valid access token for <paramref name="subject"/>.</summary>
    public HttpClient CreateClientFor(string subject)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Jwt.Create(subject));
        return client;
    }

    public static string NewSubject() => Guid.NewGuid().ToString();

    /// <summary>A short unique username that passes AUTH-4.</summary>
    public static string NewUsername() => "u" + Guid.NewGuid().ToString("N")[..12];

    public async Task<User> SeedUserAsync(
        string subject,
        string? username = null,
        UserStatus status = UserStatus.Active,
        UserRole role = UserRole.User,
        bool isPrivate = false,
        DateTimeOffset? usernameChangedAt = null)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BoulderDbContext>();
        var user = new User
        {
            AuthSubject = subject,
            Username = username ?? NewUsername(),
            DisplayName = "Seeded",
            Status = status,
            Role = role,
            IsPrivate = isPrivate,
            UsernameChangedAt = usernameChangedAt,
            AgeConfirmedAt = DateTimeOffset.UtcNow,
            GuidelinesVersion = "1",
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.Set<User>().Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public async Task SetUsernameChangedAtAsync(Guid userId, DateTimeOffset? value)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BoulderDbContext>();
        var user = await db.Set<User>().SingleAsync(u => u.Id == userId);
        user.UsernameChangedAt = value;
        await db.SaveChangesAsync();
    }
}

[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<BoulderWebApplicationFactory>
{
    public const string Name = "Api";
}
