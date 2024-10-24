namespace BlazorCaptureVision
{
    public class AppStateService
    {
        // One-day trial license key
        public string LicenseKey { get; set; } = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==";

        public event Action OnChange;

        public void SetData(string data)
        {
            LicenseKey = data;
            NotifyStateChanged();
        }

        private void NotifyStateChanged() => OnChange?.Invoke();
    }
}
