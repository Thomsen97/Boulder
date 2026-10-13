using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Boulder.Api.Auth;

/// <summary>
/// Caches the Supabase signing keys (AUTH-2). The keys are downloaded on first use and again when a token names a
/// <c>kid</c> that is not cached, at most once per <see cref="SupabaseOptions.JwksMinRefetchInterval"/>.
/// </summary>
public sealed class JwksKeyCache(
    IHttpClientFactory httpClients,
    IOptions<SupabaseOptions> options,
    TimeProvider time,
    ILogger<JwksKeyCache> logger)
{
    public const string HttpClientName = "supabase-jwks";

    private readonly SemaphoreSlim _fetchLock = new(1, 1);
    private volatile IReadOnlyList<SecurityKey> _keys = [];
    private DateTimeOffset _lastFetch = DateTimeOffset.MinValue;

    public IReadOnlyList<SecurityKey> Keys => _keys;

    public async Task EnsureKeyAsync(string? kid, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(kid) || (Contains(kid) && !IsStale()))
        {
            return;
        }

        await _fetchLock.WaitAsync(ct);
        try
        {
            if (Contains(kid) && !IsStale())
            {
                return;
            }

            var now = time.GetUtcNow();
            if (now - _lastFetch < options.Value.JwksMinRefetchInterval)
            {
                return;
            }

            _lastFetch = now;
            await FetchAsync(ct);
        }
        finally
        {
            _fetchLock.Release();
        }
    }

    private bool Contains(string kid) => _keys.Any(k => k.KeyId == kid);

    // A key that Supabase dropped from the JWKS must not stay trusted until the process restarts.
    private bool IsStale() => time.GetUtcNow() - _lastFetch > options.Value.JwksMaxAge;

    private async Task FetchAsync(CancellationToken ct)
    {
        try
        {
            var client = httpClients.CreateClient(HttpClientName);
            var json = await client.GetStringAsync(options.Value.JwksUrl, ct);

            // ES256 only: keep P-256 elliptic curve signing keys, drop everything else.
            _keys = new JsonWebKeySet(json).Keys
                .Where(k => k is { Kty: "EC", Crv: "P-256" } && (k.Use is null or "sig") && (k.Alg is null or "ES256"))
                .Cast<SecurityKey>()
                .ToList();
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException or ArgumentException
                                      or System.Text.Json.JsonException)
        {
            // Keep the keys we have; tokens with an unknown kid are rejected.
            logger.LogWarning(e, "Could not download the Supabase JWKS.");
        }
    }
}
