using System.Net;
using Boulder.IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Boulder.IntegrationTests.Health;

public class HealthEndpointTests(BoulderWebApplicationFactory factory)
    : IClassFixture<BoulderWebApplicationFactory>
{
    [Fact]
    public async Task Health_ReturnsOk()
    {
        var client = factory.CreateClient();
        var response = await client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Health_ReturnsServiceUnavailableWhenDatabaseUnreachable()
    {
        await using var unhealthyFactory = new UnhealthyFactory();
        var client = unhealthyFactory.CreateClient();
        var response = await client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    // Factory with no running DB; Timeout=1 keeps the test fast.
    private sealed class UnhealthyFactory : WebApplicationFactory<Program>
    {
        protected override IHost CreateHost(IHostBuilder builder)
        {
            builder.ConfigureHostConfiguration(config =>
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:Default"] =
                        "Host=127.0.0.1;Port=9999;Database=x;Username=x;Password=x;Timeout=1;Command Timeout=1"
                }));
            return base.CreateHost(builder);
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Test");
        }
    }
}
