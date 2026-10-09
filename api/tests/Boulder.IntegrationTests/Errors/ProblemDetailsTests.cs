using System.Net;
using System.Text.Json;
using Boulder.IntegrationTests.Infrastructure;

namespace Boulder.IntegrationTests.Errors;

public class ProblemDetailsTests(BoulderWebApplicationFactory factory)
    : IClassFixture<BoulderWebApplicationFactory>
{
    [Fact]
    public async Task UnknownRoute_ReturnsProblemJsonWithNotFoundCode()
    {
        var client = factory.CreateClient();
        var response = await client.GetAsync("/not-a-real-route");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.Equal("not_found", doc.RootElement.GetProperty("code").GetString());
    }
}
