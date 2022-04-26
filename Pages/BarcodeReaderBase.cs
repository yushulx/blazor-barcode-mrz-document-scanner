using Microsoft.AspNetCore.Components;

namespace BlazorBarcodeSample
{
    public class BarcodeReaderBase : ComponentBase
    {
        public async Task<string?> GetBarcodeFromStreamAsync(Stream stream)
        {

            try
            {
                using (var image = await SixLabors.ImageSharp.Image.LoadAsync<SixLabors.ImageSharp.PixelFormats.Rgba32>(stream))
                {
                    var reader = new ZXing.ImageSharp.BarcodeReader<SixLabors.ImageSharp.PixelFormats.Rgba32>();
                    var result = reader.Decode(image);
                    return result?.Text;
                }
            }
            catch (Exception exc)
            {
                return exc.Message;
            }

        }
    }
}
