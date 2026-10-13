using System.Net;
using Boulder.IntegrationTests.Infrastructure;
using Boulder.IntegrationTests.Users;

namespace Boulder.IntegrationTests.RateLimiting;

[Collection(ApiCollection.Name)]
public class RateLimitTests(BoulderWebApplicationFactory factory)
{
    private const string Url = "/api/v1/usernames/klatrer/availability";

    [Fact]
    public async Task UsernameAvailability_Allows30PerMinute_Then429WithRetryAfter()
    {
        var client = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());

        for (var i = 0; i < 30; i++)
        {
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(Url)).StatusCode);
        }

        var limited = await client.GetAsync(Url);

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.True(limited.Headers.TryGetValues("Retry-After", out var values));
        Assert.InRange(int.Parse(values!.Single()), 1, 60);
        Assert.Equal("rate_limited", await limited.Code());
    }

    [Fact]
    public async Task UsernameAvailability_LimitIsPerUser()
    {
        var busy = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());
        for (var i = 0; i < 31; i++)
        {
            await busy.GetAsync(Url);
        }

        var other = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());

        Assert.Equal(HttpStatusCode.OK, (await other.GetAsync(Url)).StatusCode);
    }
}
