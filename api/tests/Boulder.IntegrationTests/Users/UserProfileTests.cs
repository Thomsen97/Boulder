using System.Net;
using Boulder.Domain.Users;
using Boulder.IntegrationTests.Infrastructure;

namespace Boulder.IntegrationTests.Users;

/// <summary>
/// Authorization matrix for <c>GET /api/v1/users/{username}</c> (SPEC 11). Rows that need the social graph
/// (followers, blockers) or groups are added in phases 5 and 7 when those exist.
/// </summary>
[Collection(ApiCollection.Name)]
public class UserProfileTests(BoulderWebApplicationFactory factory)
{
    private async Task<(string Subject, string Username)> Seed(
        bool isPrivate = false, UserStatus status = UserStatus.Active)
    {
        var subject = BoulderWebApplicationFactory.NewSubject();
        var user = await factory.SeedUserAsync(subject, isPrivate: isPrivate, status: status);
        return (subject, user.Username);
    }

    public sealed record Row(string Viewer, string Target, HttpStatusCode Status, bool? CanViewContent);

    [Theory]
    //           viewer                    target                  status       canViewContent
    [InlineData("self",                    "self",                 200,         true)]
    [InlineData("self private",            "self private",         200,         true)]
    [InlineData("stranger",                "public profile",       200,         true)]
    [InlineData("stranger",                "private profile",      200,         false)] // header only (PROF-5)
    [InlineData("stranger",                "suspended",            404,         null)]
    [InlineData("stranger",                "deleted",              404,         null)]
    [InlineData("stranger",                "no such user",         404,         null)]
    [InlineData("app admin",               "public profile",       200,         true)]  // no special rights on normal endpoints
    [InlineData("app admin",               "private profile",      200,         false)]
    [InlineData("suspended viewer",        "public profile",       403,         null)]
    [InlineData("not onboarded viewer",    "public profile",       403,         null)]
    [InlineData("anonymous",               "public profile",       401,         null)]
    public async Task Matrix(string viewer, string target, int expectedStatus, bool? canViewContent)
    {
        var self = await Seed();
        var selfPrivate = await Seed(isPrivate: true);
        var publicTarget = await Seed();
        var privateTarget = await Seed(isPrivate: true);
        var suspendedTarget = await Seed(status: UserStatus.Suspended);
        var deletedTarget = await Seed(status: UserStatus.Deleted);
        var suspendedViewer = await Seed(status: UserStatus.Suspended);
        var stranger = await Seed();
        var admin = BoulderWebApplicationFactory.NewSubject();
        await factory.SeedUserAsync(admin, role: UserRole.Admin);

        var client = viewer switch
        {
            "self" => factory.CreateClientFor(self.Subject),
            "self private" => factory.CreateClientFor(selfPrivate.Subject),
            "stranger" => factory.CreateClientFor(stranger.Subject),
            "app admin" => factory.CreateClientFor(admin),
            "suspended viewer" => factory.CreateClientFor(suspendedViewer.Subject),
            "not onboarded viewer" => factory.CreateClientFor(BoulderWebApplicationFactory.NewSubject()),
            "anonymous" => factory.CreateClient(),
            _ => throw new ArgumentOutOfRangeException(nameof(viewer))
        };
        var username = target switch
        {
            "self" => self.Username,
            "self private" => selfPrivate.Username,
            "public profile" => publicTarget.Username,
            "private profile" => privateTarget.Username,
            "suspended" => suspendedTarget.Username,
            "deleted" => deletedTarget.Username,
            "no such user" => "nosuchuser",
            _ => throw new ArgumentOutOfRangeException(nameof(target))
        };

        var response = await client.GetAsync($"/api/v1/users/{username}");

        Assert.Equal((HttpStatusCode)expectedStatus, response.StatusCode);
        if (canViewContent is { } expected)
        {
            Assert.Equal(expected, (await response.Json()).GetProperty("canViewContent").GetBoolean());
        }
    }

    [Fact]
    public async Task OwnProfile_IsMarkedOwn_AndOthersAreNot()
    {
        var me = await Seed();
        var other = await Seed();
        var client = factory.CreateClientFor(me.Subject);

        var own = await (await client.GetAsync($"/api/v1/users/{me.Username}")).Json();
        var theirs = await (await client.GetAsync($"/api/v1/users/{other.Username}")).Json();

        Assert.True(own.GetProperty("isOwn").GetBoolean());
        Assert.False(theirs.GetProperty("isOwn").GetBoolean());
        Assert.Equal("none", theirs.GetProperty("followState").GetString());
    }

    [Fact]
    public async Task Lookup_IsCaseInsensitive()
    {
        var me = await Seed();
        var other = await Seed();
        var client = factory.CreateClientFor(me.Subject);

        var response = await client.GetAsync($"/api/v1/users/{other.Username.ToUpperInvariant()}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task InaccessibleProfile_Is404WithTheSameBodyShapeAsMissing()
    {
        // 404, never 403, so existence is not revealed (SEC-3).
        var viewer = await Seed();
        var suspended = await Seed(status: UserStatus.Suspended);
        var client = factory.CreateClientFor(viewer.Subject);

        var hidden = await client.GetAsync($"/api/v1/users/{suspended.Username}");
        var missing = await client.GetAsync("/api/v1/users/nosuchuser");

        Assert.Equal(HttpStatusCode.NotFound, hidden.StatusCode);
        Assert.Equal(await missing.Code(), await hidden.Code());
    }
}
