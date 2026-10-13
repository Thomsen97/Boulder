namespace Boulder.Api.Auth;

public sealed class SupabaseOptions
{
    public const string SectionName = "Supabase";
    public const string Audience = "authenticated";

    /// <summary>AUTH-2: the project's JWKS, for example https://{ref}.supabase.co/auth/v1/.well-known/jwks.json.</summary>
    public string JwksUrl { get; set; } = "";

    /// <summary>The expected <c>iss</c>, for example https://{ref}.supabase.co/auth/v1.</summary>
    public string Issuer { get; set; } = "";

    /// <summary>Shortest time between two JWKS downloads, so unknown <c>kid</c> values cannot hammer Supabase.</summary>
    public TimeSpan JwksMinRefetchInterval { get; set; } = TimeSpan.FromSeconds(30);
}
