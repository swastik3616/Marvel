import sounddevice as sd
import numpy as np

devices = [2, 3, 16, 18]

for dev in devices:
    try:
        print(f"Testing device {dev} - speak now for 2 seconds...")
        audio = sd.rec(int(2 * 16000), samplerate=16000, channels=1, dtype='float32', device=dev)
        sd.wait()
        rms = np.sqrt(np.mean(audio**2))
        boosted = np.clip(audio * 10.0, -1.0, 1.0)
        boosted_rms = np.sqrt(np.mean(boosted**2))
        name = sd.query_devices(dev)["name"]
        print(f"  Raw RMS:     {rms:.5f}")
        print(f"  Boosted RMS: {boosted_rms:.5f}")
        print(f"  Device name: {name}")
        print()
    except Exception as e:
        print(f"  Device {dev} failed: {e}\n")