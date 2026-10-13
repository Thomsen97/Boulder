namespace Boulder.IntegrationTests.Infrastructure;

/// <summary>The server clock in tests: real time plus an offset that a test can move forward.</summary>
public sealed class TestClock : TimeProvider
{
    private long _offsetTicks;

    public void Advance(TimeSpan by) => Interlocked.Add(ref _offsetTicks, by.Ticks);

    public override DateTimeOffset GetUtcNow() =>
        base.GetUtcNow() + TimeSpan.FromTicks(Interlocked.Read(ref _offsetTicks));
}
