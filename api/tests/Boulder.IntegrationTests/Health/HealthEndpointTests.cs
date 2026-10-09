using Boulder.IntegrationTests.Infrastructure;

namespace Boulder.IntegrationTests.Health;

public class HealthEndpointTests(BoulderWebApplicationFactory factory)
    : IClassFixture<BoulderWebApplicationFactory>
{
    [Fact]
    public async Task Health_ReturnsOk()
    {
        var client = factory.CreateClient();
        var response = await client.GetAsync("/health");
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
    }
}
