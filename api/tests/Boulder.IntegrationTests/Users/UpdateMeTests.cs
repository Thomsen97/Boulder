using System.Net;
using System.Net.Http.Json;
using Boulder.IntegrationTests.Infrastructure;

namespace Boulder.IntegrationTests.Users;

[Collection(ApiCollection.Name)]
public class UpdateMeTests(BoulderWebApplicationFactory factory)
{
    private async Task<(HttpClient Client, string Username)> OnboardedClient()
    {
        var client = factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject());
        var username = BoulderWebApplicationFactory.NewUsername();
        Assert.Equal(HttpStatusCode.Created, (await client.Onboard(username)).StatusCode);
        return (client, username);
    }

    [Fact]
    public async Task Patch_ChangesOnlyTheGivenFields()
    {
        var (client, username) = await OnboardedClient();

        var response = await client.PatchAsJsonAsync("/api/v1/me", new
        {
            displayName = "Ny Klatrer",
            bio = "Elsker buldring",
            isPrivate = true,
            shareAscents = false,
            spoilerMode = "all_unsent"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var me = await response.Json();
        Assert.Equal("Ny Klatrer", me.GetProperty("displayName").GetString());
        Assert.Equal("Elsker buldring", me.GetProperty("bio").GetString());
        Assert.True(me.GetProperty("isPrivate").GetBoolean());
        Assert.False(me.GetProperty("shareAscents").GetBoolean());
        Assert.Equal("all_unsent", me.GetProperty("spoilerMode").GetString());
        Assert.Equal(username, me.GetProperty("username").GetString());

        // A later patch with one field leaves the others alone.
        var second = await (await client.PatchAsJsonAsync("/api/v1/me", new { bio = "" })).Json();
        Assert.Equal("", second.GetProperty("bio").GetString());
        Assert.Equal("Ny Klatrer", second.GetProperty("displayName").GetString());
        Assert.True(second.GetProperty("isPrivate").GetBoolean());
    }

    [Theory]
    [InlineData("bio", 161)]
    [InlineData("displayName", 51)]
    [InlineData("displayName", 0)]
    public async Task Patch_TooLongOrEmptyText_Returns400(string field, int length)
    {
        var (client, _) = await OnboardedClient();

        var response = await client.PatchAsJsonAsync("/api/v1/me", new Dictionary<string, string>
        {
            [field] = new string('x', length)
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("validation_failed", await response.Code());
    }

    [Fact]
    public async Task Patch_Bio_AcceptsExactly160Characters()
    {
        var (client, _) = await OnboardedClient();

        var response = await client.PatchAsJsonAsync("/api/v1/me", new { bio = new string('x', 160) });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Patch_UnknownSpoilerMode_Returns400()
    {
        var (client, _) = await OnboardedClient();

        var response = await client.PatchAsJsonAsync("/api/v1/me", new { spoilerMode = "everything" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Rename_IsLimitedToOncePer30Days()
    {
        var (client, _) = await OnboardedClient();

        var first = await client.PatchAsJsonAsync("/api/v1/me", new { username = BoulderWebApplicationFactory.NewUsername() });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.NotEqual(
            System.Text.Json.JsonValueKind.Null,
            (await first.Json()).GetProperty("usernameChangedAt").ValueKind);

        var second = await client.PatchAsJsonAsync("/api/v1/me", new { username = BoulderWebApplicationFactory.NewUsername() });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Equal("username_change_too_soon", await second.Code());
    }

    [Fact]
    public async Task Rename_IsAllowedAgainAfter30Days()
    {
        var subject = BoulderWebApplicationFactory.NewSubject();
        var user = await factory.SeedUserAsync(subject, usernameChangedAt: DateTimeOffset.UtcNow.AddDays(-31));
        var client = factory.CreateClientFor(subject);
        var newName = BoulderWebApplicationFactory.NewUsername();

        var response = await client.PatchAsJsonAsync("/api/v1/me", new { username = newName });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(newName, (await response.Json()).GetProperty("username").GetString());
        Assert.NotEqual(user.Username, newName);
    }

    [Fact]
    public async Task Rename_InsideTheWindow_Returns409()
    {
        var subject = BoulderWebApplicationFactory.NewSubject();
        await factory.SeedUserAsync(subject, usernameChangedAt: DateTimeOffset.UtcNow.AddDays(-29));
        var client = factory.CreateClientFor(subject);

        var response = await client.PatchAsJsonAsync("/api/v1/me", new { username = BoulderWebApplicationFactory.NewUsername() });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("username_change_too_soon", await response.Code());
    }

    [Fact]
    public async Task Rename_ToTheSameNameInOtherCase_IsANoOpAndDoesNotUseTheLimit()
    {
        var (client, username) = await OnboardedClient();

        var same = await client.PatchAsJsonAsync("/api/v1/me", new { username = username.ToUpperInvariant() });
        Assert.Equal(HttpStatusCode.OK, same.StatusCode);
        Assert.Equal(
            System.Text.Json.JsonValueKind.Null,
            (await same.Json()).GetProperty("usernameChangedAt").ValueKind);

        var real = await client.PatchAsJsonAsync("/api/v1/me", new { username = BoulderWebApplicationFactory.NewUsername() });
        Assert.Equal(HttpStatusCode.OK, real.StatusCode);
    }

    [Fact]
    public async Task Rename_ToATakenName_Returns409AndKeepsTheOldName()
    {
        var (_, takenName) = await OnboardedClient();
        var (client, username) = await OnboardedClient();

        var response = await client.PatchAsJsonAsync("/api/v1/me", new { username = takenName.ToUpperInvariant() });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("username_taken", await response.Code());
        var me = await (await client.GetAsync("/api/v1/me")).Json();
        Assert.Equal(username, me.GetProperty("username").GetString());
        Assert.Equal(
            System.Text.Json.JsonValueKind.Null,
            me.GetProperty("usernameChangedAt").ValueKind);
    }

    [Fact]
    public async Task Rename_ToAnInvalidName_Returns400()
    {
        var (client, _) = await OnboardedClient();

        var response = await client.PatchAsJsonAsync("/api/v1/me", new { username = "admin" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task IdsInTheBodyAreIgnored_TheCallerIsAlwaysTheTokenSubject()
    {
        // SEC-4: ownership comes from the token. A body naming another user changes nothing there.
        var (_, otherName) = await OnboardedClient();
        var (client, _) = await OnboardedClient();

        var response = await client.PatchAsJsonAsync("/api/v1/me", new
        {
            id = Guid.NewGuid(),
            authSubject = "someone-else",
            username = otherName,
            bio = "mine"
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode); // the username is taken; no impersonation
        var other = await (await client.GetAsync($"/api/v1/users/{otherName}")).Json();
        Assert.Equal("", other.GetProperty("bio").GetString());
    }
}
