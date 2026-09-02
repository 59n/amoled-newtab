import struct, zlib, pathlib

def chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)

def png(size):
    rows = []
    inset = max(2, size // 8)
    for y in range(size):
        row = [0]
        for x in range(size):
            edge = x < inset or y < inset or x >= size - inset or y >= size - inset
            inner = inset <= x < size - inset and inset <= y < size - inset
            frame = edge and not (inset + 1 <= x < size - inset - 1 and inset + 1 <= y < size - inset - 1)
            if frame and inner:
                row += [0x2A, 0x2A, 0x2A]
            else:
                row += [0, 0, 0]
        rows.append(bytes(row))
    raw = b"".join(rows)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")

out = pathlib.Path("icons")
out.mkdir(exist_ok=True)
for s in (16, 48, 128):
    (out / f"icon{s}.png").write_bytes(png(s))
print("wrote icons")
