using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Boulder.Api.Auth;

public static class AuthenticationSetup
{
    public static IServiceCollection AddSupabaseAuthentication(
        this IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection(SupabaseOptions.SectionName);
        if (string.IsNullOrWhiteSpace(section["JwksUrl"]) || string.IsNullOrWhiteSpace(section["Issuer"]))
        {
            throw new InvalidOperationException(
                "Supabase:JwksUrl and Supabase:Issuer must be configured (see .env.example).");
        }

        services.Configure<SupabaseOptions>(section);
        services.AddHttpClient(JwksKeyCache.HttpClientName, c => c.Timeout = TimeSpan.FromSeconds(10));
        services.AddSingleton<JwksKeyCache>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<JwksKeyCache, IOptions<SupabaseOptions>>((jwt, keys, supabase) =>
            {
                jwt.MapInboundClaims = false;
                jwt.TokenValidationParameters = new TokenValidationParameters
                {
                    // SEC-2: asymmetric ES256 only. HS256 and unsigned tokens fail on these two lines.
                    ValidAlgorithms = [SecurityAlgorithms.EcdsaSha256],
                    RequireSignedTokens = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeyResolver = (_, _, kid, _) =>
                        string.IsNullOrEmpty(kid) ? [] : keys.Keys.Where(k => k.KeyId == kid),

                    ValidateIssuer = true,
                    ValidIssuer = supabase.Value.Issuer,
                    ValidateAudience = true,
                    ValidAudience = SupabaseOptions.Audience,
                    ValidateLifetime = true,
                    RequireExpirationTime = true,
                    ClockSkew = TimeSpan.FromSeconds(60)
                };

                jwt.Events = new JwtBearerEvents
                {
                    // The key resolver is synchronous, so download unknown keys before validation starts.
                    OnMessageReceived = async context =>
                    {
                        var header = context.Request.Headers.Authorization.ToString();
                        if (!header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                        {
                            return;
                        }

                        string? kid = null;
                        try
                        {
                            kid = new JsonWebToken(header["Bearer ".Length..].Trim()).Kid;
                        }
                        catch (ArgumentException)
                        {
                            // Not a JWT: validation rejects it.
                        }

                        await keys.EnsureKeyAsync(kid, context.HttpContext.RequestAborted);
                    }
                };
            });

        // Secure by default: every endpoint needs a valid token unless it says AllowAnonymous.
        services.AddAuthorization(o => o.FallbackPolicy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .Build());

        return services;
    }
}
