namespace Boulder.IntegrationTests.Infrastructure;

/// <summary>
/// The server clock in tests: real time plus an offset that a test can move forward. It never moves back: the
/// JWKS cache remembers when it last fetched, and a clock that returns to the past would block its refetches.
/// </summary>
public sealed class TestClock : TimeProvider
{
    private long _offsetTicks;

    public void Advance(TimeSpan by) => Interlocked.Add(ref _offsetTicks, by.Ticks);

    public override DateTimeOffset GetUtcNow() =>
        base.GetUtcNow() + TimeSpan.FromTicks(Interlocked.Read(ref _offsetTicks));
}
