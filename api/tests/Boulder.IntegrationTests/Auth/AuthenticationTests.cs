using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Boulder.IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Boulder.IntegrationTests.Auth;

[Collection(ApiCollection.Name)]
public class AuthenticationTests(BoulderWebApplicationFactory factory)
{
    private const string MeUrl = "/api/v1/me";

    private async Task<HttpResponseMessage> GetMeWith(string? token)
    {
        var client = factory.CreateClient();
        if (token is not null)
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        return await client.GetAsync(MeUrl);
    }

    private static async Task AssertProblemCode(HttpResponseMessage response, string code)
    {
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(code, doc.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task ValidToken_IsAccepted()
    {
        var response = await GetMeWith(factory.Jwt.Create(BoulderWebApplicationFactory.NewSubject()));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task MissingToken_Returns401WithCode()
    {
        var response = await GetMeWith(null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        await AssertProblemCode(response, "unauthorized");
    }

    [Fact]
    public async Task ExpiredToken_Returns401()
    {
        var token = factory.Jwt.Create(BoulderWebApplicationFactory.NewSubject(), lifetime: TimeSpan.FromMinutes(-5));

        Assert.Equal(HttpStatusCode.Unauthorized, (await GetMeWith(token)).StatusCode);
    }

    [Fact]
    public async Task TokenExpiredWithinClockSkew_IsAccepted()
    {
        var token = factory.Jwt.Create(BoulderWebApplicationFactory.NewSubject(), lifetime: TimeSpan.FromSeconds(-30));

        Assert.Equal(HttpStatusCode.OK, (await GetMeWith(token)).StatusCode);
    }

    [Fact]
    public async Task WrongIssuer_Returns401()
    {
        var token = factory.Jwt.Create(
            BoulderWebApplicationFactory.NewSubject(), issuer: "https://evil.invalid/auth/v1");

        Assert.Equal(HttpStatusCode.Unauthorized, (await GetMeWith(token)).StatusCode);
    }

    [Fact]
    public async Task WrongAudience_Returns401()
    {
        var token = factory.Jwt.Create(BoulderWebApplicationFactory.NewSubject(), audience: "anon");

        Assert.Equal(HttpStatusCode.Unauthorized, (await GetMeWith(token)).StatusCode);
    }

    [Fact]
    public async Task Hs256SignedToken_Returns401()
    {
        var token = factory.Jwt.CreateHs256(BoulderWebApplicationFactory.NewSubject());

        Assert.Equal(HttpStatusCode.Unauthorized, (await GetMeWith(token)).StatusCode);
    }

    [Fact]
    public async Task UnsignedToken_Returns401()
    {
        var token = factory.Jwt.CreateUnsigned(BoulderWebApplicationFactory.NewSubject());

        Assert.Equal(HttpStatusCode.Unauthorized, (await GetMeWith(token)).StatusCode);
    }

    [Fact]
    public async Task TokenSignedWithUnpublishedKey_Returns401()
    {
        var token = factory.Jwt.Create(BoulderWebApplicationFactory.NewSubject(), key: new TestSigningKey());

        Assert.Equal(HttpStatusCode.Unauthorized, (await GetMeWith(token)).StatusCode);
    }

    [Fact]
    public async Task TokenWithPublishedKidButForeignSignature_Returns401()
    {
        // Same kid as a published key, but signed by a different private key.
        var impostor = new TestSigningKey();
        var forged = factory.Jwt.Create(
            BoulderWebApplicationFactory.NewSubject(),
            key: new TestSigningKey(impostor.Key, factory.Jwt.Key.Kid));

        Assert.Equal(HttpStatusCode.Unauthorized, (await GetMeWith(forged)).StatusCode);
    }

    [Fact]
    public async Task TokenWithoutKid_Returns401()
    {
        var token = factory.Jwt.Create(BoulderWebApplicationFactory.NewSubject(), includeKid: false);

        Assert.Equal(HttpStatusCode.Unauthorized, (await GetMeWith(token)).StatusCode);
    }

    [Fact]
    public async Task GarbageToken_Returns401()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await GetMeWith("not-a-jwt")).StatusCode);
    }

    [Fact]
    public async Task KeyRotation_UnknownKidTriggersJwksRefetch()
    {
        var rotated = new TestSigningKey();
        var token = factory.Jwt.Create(BoulderWebApplicationFactory.NewSubject(), key: rotated);

        // Not published yet: rejected.
        Assert.Equal(HttpStatusCode.Unauthorized, (await GetMeWith(token)).StatusCode);

        var requestsBefore = factory.Jwks.Requests;
        TestJwt.Publish(factory.Jwks, rotated);

        // The unknown kid made the API download the JWKS again.
        Assert.Equal(HttpStatusCode.OK, (await GetMeWith(token)).StatusCode);
        Assert.True(factory.Jwks.Requests > requestsBefore);
    }

    [Fact]
    public async Task RevokedKey_StopsWorkingAfterTheJwksMaxAge()
    {
        var key = new TestSigningKey();
        TestJwt.Publish(factory.Jwks, key);
        var token = factory.Jwt.Create(BoulderWebApplicationFactory.NewSubject(), key: key);
        Assert.Equal(HttpStatusCode.OK, (await GetMeWith(token)).StatusCode);

        // Supabase drops the key from the JWKS. Inside the max age the cached key is still trusted ...
        factory.Jwks.Keys.Remove(key);
        Assert.Equal(HttpStatusCode.OK, (await GetMeWith(token)).StatusCode);

        // ... after it the JWKS is downloaded again and the revoked key is gone.
        factory.Clock.Advance(TimeSpan.FromMinutes(11));
        Assert.Equal(HttpStatusCode.Unauthorized, (await GetMeWith(token)).StatusCode);
    }

    [Fact]
    public void TokenValidation_AcceptsOnlyEs256SignedTokens()
    {
        // SEC-2: HS256 and unsigned tokens must be rejected by the algorithm rules themselves, not only because
        // no matching key exists.
        var options = factory.Services
            .GetRequiredService<IOptionsMonitor<JwtBearerOptions>>()
            .Get(JwtBearerDefaults.AuthenticationScheme);

        Assert.Equal(["ES256"], options.TokenValidationParameters.ValidAlgorithms);
        Assert.True(options.TokenValidationParameters.RequireSignedTokens);
        Assert.True(options.TokenValidationParameters.ValidateIssuerSigningKey);
    }

    [Fact]
    public async Task KnownKid_DoesNotRefetchJwks()
    {
        var token = factory.Jwt.Create(BoulderWebApplicationFactory.NewSubject());
        await GetMeWith(token); // make sure the key is cached
        var requestsBefore = factory.Jwks.Requests;

        for (var i = 0; i < 3; i++)
        {
            Assert.Equal(HttpStatusCode.OK, (await GetMeWith(token)).StatusCode);
        }

        Assert.Equal(requestsBefore, factory.Jwks.Requests);
    }

    [Fact]
    public async Task Health_StaysAnonymous()
    {
        var response = await factory.CreateClient().GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task OpenApiDocument_StaysAnonymous()
    {
        var response = await factory.CreateClient().GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(doc.RootElement.TryGetProperty("paths", out _));
    }
}
