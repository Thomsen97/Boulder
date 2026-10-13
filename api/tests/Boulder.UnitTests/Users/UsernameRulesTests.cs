using Boulder.Domain.Users;

namespace Boulder.UnitTests.Users;

public class UsernameRulesTests
{
    [Theory]
    [InlineData("abc")]
    [InlineData("klatrer1")]
    [InlineData("a.b_c")]
    [InlineData("a1234567890123456789")] // 20 characters
    [InlineData("  Klatrer  ")] // trimmed and lowercased first
    [InlineData("KLATRER")]
    public void Valid(string name) => Assert.Equal(UsernameError.None, UsernameRules.Validate(name));

    [Theory]
    [InlineData("", UsernameError.TooShort)]
    [InlineData("ab", UsernameError.TooShort)]
    [InlineData("a12345678901234567890", UsernameError.TooLong)] // 21 characters
    [InlineData("has space", UsernameError.InvalidCharacters)]
    [InlineData("dash-name", UsernameError.InvalidCharacters)]
    [InlineData("blåbær", UsernameError.InvalidCharacters)]
    [InlineData("emoji😀", UsernameError.InvalidCharacters)]
    [InlineData("1abc", UsernameError.MustStartWithLetter)]
    [InlineData(".abc", UsernameError.MustStartWithLetter)]
    [InlineData("_abc", UsernameError.MustStartWithLetter)]
    [InlineData("admin", UsernameError.Reserved)]
    [InlineData("Support", UsernameError.Reserved)]
    [InlineData("boulder", UsernameError.Reserved)]
    public void Invalid(string name, UsernameError expected) =>
        Assert.Equal(expected, UsernameRules.Validate(name));

    [Fact]
    public void Normalize_TrimsAndLowercases() =>
        Assert.Equal("klatrer.1", UsernameRules.Normalize("  Klatrer.1 "));

    [Fact]
    public void Normalize_IsCultureIndependent()
    {
        // Turkish dotless i must not change the result.
        var old = Thread.CurrentThread.CurrentCulture;
        try
        {
            Thread.CurrentThread.CurrentCulture = new System.Globalization.CultureInfo("tr-TR");
            Assert.Equal("title", UsernameRules.Normalize("TITLE"));
        }
        finally
        {
            Thread.CurrentThread.CurrentCulture = old;
        }
    }

    private static readonly DateTimeOffset Now = new(2026, 10, 13, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void NeverChanged_MayChangeNow() => Assert.Null(UsernameRules.NextChangeAt(null, Now));

    [Fact]
    public void ChangedYesterday_MustWait()
    {
        var changed = Now.AddDays(-1);

        Assert.Equal(changed.AddDays(30), UsernameRules.NextChangeAt(changed, Now));
    }

    [Fact]
    public void ChangedJustUnder30DaysAgo_MustStillWait() =>
        Assert.NotNull(UsernameRules.NextChangeAt(Now.AddDays(-30).AddSeconds(1), Now));

    [Fact]
    public void ChangedExactly30DaysAgo_MayChange() =>
        Assert.Null(UsernameRules.NextChangeAt(Now.AddDays(-30), Now));

    [Fact]
    public void ChangedLongAgo_MayChange() =>
        Assert.Null(UsernameRules.NextChangeAt(Now.AddDays(-400), Now));
}
