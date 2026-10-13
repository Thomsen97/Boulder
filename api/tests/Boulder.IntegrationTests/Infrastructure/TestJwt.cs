using System.Globalization;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Boulder.IntegrationTests.Infrastructure;

/// <summary>A real ES256 key pair, like the ones Supabase signs with.</summary>
public sealed class TestSigningKey
{
    public TestSigningKey()
        : this(ECDsa.Create(ECCurve.NamedCurves.nistP256), Guid.NewGuid().ToString("N"))
    {
    }

    public TestSigningKey(ECDsa key, string kid)
    {
        Key = key;
        Kid = kid;
    }

    public string Kid { get; }

    public ECDsa Key { get; }

    public object ToJwk()
    {
        var p = Key.ExportParameters(false);
        return new
        {
            kty = "EC",
            crv = "P-256",
            alg = "ES256",
            use = "sig",
            kid = Kid,
            x = Base64UrlEncoder.Encode(p.Q.X),
            y = Base64UrlEncoder.Encode(p.Q.Y)
        };
    }
}

/// <summary>Serves the JWKS over the real HTTP client path, so key download and refetch are exercised.</summary>
public sealed class StubJwksHandler : HttpMessageHandler
{
    private int _requests;

    public List<TestSigningKey> Keys { get; } = [];

    public int Requests => _requests;

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        Interlocked.Increment(ref _requests);
        var json = JsonSerializer.Serialize(new { keys = Keys.Select(k => k.ToJwk()).ToArray() });
        return Task.FromResult(new HttpResponseMessage { Content = new StringContent(json, Encoding.UTF8, "application/json") });
    }
}

public sealed class TestJwt(StubJwksHandler jwks)
{
    public const string Issuer = "https://test.supabase.invalid/auth/v1";
    public const string Audience = "authenticated";

    /// <summary>The key the JWKS publishes and tokens are signed with unless a test says otherwise.</summary>
    public TestSigningKey Key { get; } = Publish(jwks, new TestSigningKey());

    public static TestSigningKey Publish(StubJwksHandler jwks, TestSigningKey key)
    {
        jwks.Keys.Add(key);
        return key;
    }

    public string Create(
        string subject,
        string issuer = Issuer,
        string audience = Audience,
        TimeSpan? lifetime = null,
        TestSigningKey? key = null,
        bool includeKid = true)
    {
        key ??= Key;
        var expires = DateTime.UtcNow + (lifetime ?? TimeSpan.FromHours(1));
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = issuer,
            Audience = audience,
            NotBefore = expires.AddHours(-2),
            IssuedAt = expires.AddHours(-2),
            Expires = expires,
            Subject = new ClaimsIdentity([new Claim("sub", subject)]),
            SigningCredentials = new SigningCredentials(
                new ECDsaSecurityKey(key.Key) { KeyId = includeKid ? key.Kid : null },
                SecurityAlgorithms.EcdsaSha256)
        };
        return new JsonWebTokenHandler().CreateToken(descriptor);
    }

    /// <summary>A token signed with a symmetric key, which Supabase never issues now (SEC-2).</summary>
    public string CreateHs256(string subject)
    {
        var secret = new SymmetricSecurityKey(RandomNumberGenerator.GetBytes(32)) { KeyId = Key.Kid };
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = Issuer,
            Audience = Audience,
            Expires = DateTime.UtcNow.AddHours(1),
            Subject = new ClaimsIdentity([new Claim("sub", subject)]),
            SigningCredentials = new SigningCredentials(secret, SecurityAlgorithms.HmacSha256)
        };
        return new JsonWebTokenHandler().CreateToken(descriptor);
    }

    /// <summary>A token with <c>alg: none</c> and no signature.</summary>
    public string CreateUnsigned(string subject)
    {
        var header = Base64UrlEncoder.Encode(JsonSerializer.Serialize(new { alg = "none", typ = "JWT", kid = Key.Kid }));
        var exp = DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);
        var payload = Base64UrlEncoder.Encode(JsonSerializer.Serialize(new Dictionary<string, object>
        {
            ["sub"] = subject,
            ["iss"] = Issuer,
            ["aud"] = Audience,
            ["exp"] = long.Parse(exp, CultureInfo.InvariantCulture)
        }));
        return $"{header}.{payload}.";
    }
}
