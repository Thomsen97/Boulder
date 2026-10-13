using Boulder.IntegrationTests.Infrastructure;

namespace Boulder.IntegrationTests.Logging;

/// <summary>SEC-11: usernames are in request paths and must never reach the logs.</summary>
[Collection(ApiCollection.Name)]
public class RequestLoggingTests(BoulderWebApplicationFactory factory)
{
    [Fact]
    public async Task Usernames_NeverAppearInLogEvents()
    {
        var viewer = BoulderWebApplicationFactory.NewSubject();
        await factory.SeedUserAsync(viewer);
        var target = await factory.SeedUserAsync(BoulderWebApplicationFactory.NewSubject());
        var missing = BoulderWebApplicationFactory.NewUsername();
        var client = factory.CreateClientFor(viewer);

        await client.GetAsync($"/api/v1/users/{target.Username}");
        await client.GetAsync($"/api/v1/users/{missing}");
        await client.GetAsync($"/api/v1/usernames/{missing}/availability");

        var events = factory.LogSink.Events;
        Assert.True(events.Any(e => e.Contains("responded")), "captured: " + string.Join(" | ", events)); // the request log is being captured at all
        Assert.DoesNotContain(events, e => e.Contains(target.Username, StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(events, e => e.Contains(missing, StringComparison.OrdinalIgnoreCase));
    }
}
