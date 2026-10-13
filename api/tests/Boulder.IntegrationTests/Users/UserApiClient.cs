using System.Net.Http.Json;
using System.Text.Json;

namespace Boulder.IntegrationTests.Users;

internal static class UserApiClient
{
    public static Task<HttpResponseMessage> Onboard(
        this HttpClient client,
        string username,
        string displayName = "Klatrer",
        bool ageConfirmed = true,
        string guidelinesVersion = "1") =>
        client.PostAsJsonAsync("/api/v1/me/onboarding", new { username, displayName, ageConfirmed, guidelinesVersion });

    public static async Task<JsonElement> Json(this HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    public static async Task<string?> Code(this HttpResponseMessage response) =>
        (await response.Json()).GetProperty("code").GetString();
}
