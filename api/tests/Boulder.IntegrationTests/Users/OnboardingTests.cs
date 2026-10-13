using System.Net;
using System.Net.Http.Json;
using Boulder.IntegrationTests.Infrastructure;

namespace Boulder.IntegrationTests.Users;

[Collection(ApiCollection.Name)]
public class OnboardingTests(BoulderWebApplicationFactory factory)
{
    [Fact]
    public async Task GetMe_BeforeOnboarding_ReportsOnboardingIncomplete()
    {
        var client = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());

        var response = await client.GetAsync("/api/v1/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Json();
        Assert.False(body.GetProperty("onboardingComplete").GetBoolean());
        Assert.Equal(System.Text.Json.JsonValueKind.Null, body.GetProperty("username").ValueKind);
    }

    [Theory]
    [InlineData("GET", "/api/v1/users/someone")]
    [InlineData("PATCH", "/api/v1/me")]
    public async Task NotOnboarded_OtherEndpoints_Return403OnboardingRequired(string method, string url)
    {
        var client = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());

        var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), url)
        {
            Content = method == "PATCH" ? JsonContent.Create(new { bio = "hei" }) : null
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("onboarding_required", await response.Code());
    }

    [Fact]
    public async Task Onboarding_CreatesTheUser()
    {
        var client = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());
        var username = BoulderWebApplicationFactory.NewUsername();

        var created = await client.Onboard(username, displayName: "  Emma  ");

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var me = await created.Json();
        Assert.True(me.GetProperty("onboardingComplete").GetBoolean());
        Assert.Equal(username, me.GetProperty("username").GetString());
        Assert.Equal("Emma", me.GetProperty("displayName").GetString());
        Assert.Equal("projects", me.GetProperty("spoilerMode").GetString());
        Assert.False(me.GetProperty("isPrivate").GetBoolean());
        Assert.True(me.GetProperty("shareAscents").GetBoolean());

        var again = await (await client.GetAsync("/api/v1/me")).Json();
        Assert.Equal(username, again.GetProperty("username").GetString());
        // Other endpoints are open now.
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/v1/users/{username}")).StatusCode);
    }

    [Fact]
    public async Task Onboarding_StoresUsernameInLowerCase()
    {
        var client = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());
        var username = BoulderWebApplicationFactory.NewUsername();

        var created = await client.Onboard(username.ToUpperInvariant());

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Equal(username, (await created.Json()).GetProperty("username").GetString());
    }

    [Fact]
    public async Task DuplicateUsername_AnyCase_Returns409()
    {
        var username = BoulderWebApplicationFactory.NewUsername();
        var first = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());
        Assert.Equal(HttpStatusCode.Created, (await first.Onboard(username)).StatusCode);

        var second = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());
        var response = await second.Onboard(username.ToUpperInvariant());

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("username_taken", await response.Code());
    }

    [Fact]
    public async Task ConcurrentOnboardingWithSameUsername_ExactlyOneWins()
    {
        var username = BoulderWebApplicationFactory.NewUsername();
        var clients = Enumerable.Range(0, 4)
            .Select(_ => factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject()))
            .ToList();

        var responses = await Task.WhenAll(clients.Select(c => c.Onboard(username)));

        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Created);
        Assert.All(
            responses.Where(r => r.StatusCode != HttpStatusCode.Created),
            r => Assert.Equal(HttpStatusCode.Conflict, r.StatusCode));
    }

    [Fact]
    public async Task OnboardingTwice_Returns409AlreadyOnboarded()
    {
        var client = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());
        Assert.Equal(HttpStatusCode.Created, (await client.Onboard(BoulderWebApplicationFactory.NewUsername())).StatusCode);

        var response = await client.Onboard(BoulderWebApplicationFactory.NewUsername());

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("already_onboarded", await response.Code());
    }

    [Theory]
    [InlineData("ab", "Klatrer", true, "1", "username")]
    [InlineData("1abc", "Klatrer", true, "1", "username")]
    [InlineData("admin", "Klatrer", true, "1", "username")]
    [InlineData("has space", "Klatrer", true, "1", "username")]
    [InlineData("klatrer1", "", true, "1", "displayName")]
    [InlineData("klatrer1", "   ", true, "1", "displayName")]
    [InlineData("klatrer1", "Klatrer", false, "1", "ageConfirmed")]
    [InlineData("klatrer1", "Klatrer", true, "", "guidelinesVersion")]
    public async Task InvalidInput_Returns400WithFieldError(
        string username, string displayName, bool ageConfirmed, string guidelinesVersion, string field)
    {
        var client = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());

        var response = await client.Onboard(username, displayName, ageConfirmed, guidelinesVersion);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Json();
        Assert.Equal("validation_failed", body.GetProperty("code").GetString());
        Assert.True(body.GetProperty("errors").TryGetProperty(field, out _));
    }

    [Fact]
    public async Task DisplayName_IsLimitedTo50Characters()
    {
        var client = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());

        Assert.Equal(
            HttpStatusCode.BadRequest,
            (await client.Onboard(BoulderWebApplicationFactory.NewUsername(), new string('å', 51))).StatusCode);
        Assert.Equal(
            HttpStatusCode.Created,
            (await client.Onboard(BoulderWebApplicationFactory.NewUsername(), new string('å', 50))).StatusCode);
    }

    [Fact]
    public async Task InvalidOnboarding_DoesNotCreateTheUser()
    {
        var client = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());
        await client.Onboard("ab");

        var me = await (await client.GetAsync("/api/v1/me")).Json();

        Assert.False(me.GetProperty("onboardingComplete").GetBoolean());
    }

    [Theory]
    [InlineData("klatrer.1", true, null)]
    [InlineData("ab", false, "tooShort")]
    [InlineData("aaaaaaaaaaaaaaaaaaaaa", false, "tooLong")]
    [InlineData("Has-Dash", false, "invalidChars")]
    [InlineData("1abc", false, "mustStartWithLetter")]
    [InlineData("Support", false, "reserved")]
    public async Task Availability_ChecksRules_BeforeOnboarding(string name, bool available, string? reason)
    {
        var client = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());

        var response = await client.GetAsync($"/api/v1/usernames/{name}/availability");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Json();
        Assert.Equal(available, body.GetProperty("available").GetBoolean());
        Assert.Equal(reason, body.GetProperty("reason").GetString());
    }

    [Fact]
    public async Task Availability_ReportsTakenAnyCase_ButNotTheCallersOwnName()
    {
        var username = BoulderWebApplicationFactory.NewUsername();
        var owner = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());
        await owner.Onboard(username);
        var other = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());

        var taken = await (await other.GetAsync($"/api/v1/usernames/{username.ToUpperInvariant()}/availability")).Json();
        var own = await (await owner.GetAsync($"/api/v1/usernames/{username}/availability")).Json();

        Assert.False(taken.GetProperty("available").GetBoolean());
        Assert.Equal("taken", taken.GetProperty("reason").GetString());
        Assert.True(own.GetProperty("available").GetBoolean());
    }
}
