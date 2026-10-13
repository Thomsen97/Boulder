using System.Net;
using System.Net.Http.Json;
using Boulder.Domain.Users;
using Boulder.IntegrationTests.Infrastructure;

namespace Boulder.IntegrationTests.Users;

[Collection(ApiCollection.Name)]
public class SuspensionTests(BoulderWebApplicationFactory factory)
{
    private async Task<HttpClient> SuspendedClient()
    {
        var subject = BoulderWebApplicationFactory.NewSubject();
        await factory.SeedUserAsync(subject, status: UserStatus.Suspended);
        return factory.CreateClientFor(subject);
    }

    [Fact]
    public async Task SuspendedUser_CanStillReadMe_AndSeesTheStatus()
    {
        var client = await SuspendedClient();

        var response = await client.GetAsync("/api/v1/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var me = await response.Json();
        Assert.Equal("suspended", me.GetProperty("status").GetString());
        Assert.True(me.GetProperty("onboardingComplete").GetBoolean());
    }

    [Theory]
    [InlineData("GET", "/api/v1/users/anyone")]
    [InlineData("GET", "/api/v1/usernames/anyone/availability")]
    [InlineData("PATCH", "/api/v1/me")]
    [InlineData("POST", "/api/v1/me/onboarding")]
    public async Task SuspendedUser_GetsAccountSuspended_OnEverythingElse(string method, string url)
    {
        var client = await SuspendedClient();

        var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), url)
        {
            Content = method == "GET" ? null : JsonContent.Create(new { bio = "x" })
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("account_suspended", await response.Code());
    }

    [Fact]
    public async Task DeletedUser_IsTreatedAsUnauthenticated()
    {
        var subject = BoulderWebApplicationFactory.NewSubject();
        await factory.SeedUserAsync(subject, status: UserStatus.Deleted);
        var client = factory.CreateClientFor(subject);

        var response = await client.GetAsync("/api/v1/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SuspendedUsersName_StaysReserved()
    {
        var subject = BoulderWebApplicationFactory.NewSubject();
        var suspended = await factory.SeedUserAsync(subject, status: UserStatus.Suspended);
        var client = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());

        var response = await client.Onboard(suspended.Username);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }
}
