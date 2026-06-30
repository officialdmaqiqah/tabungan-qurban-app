export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    // Pastikan nomor diawali dengan kode negara tanpa +, e.g., 6281...
    const formattedNumber = to.startsWith('0') ? '62' + to.slice(1) : to;

    // TODO: Ganti endpoint dan payload sesuai dokumentasi resmi API xsender.id 
    // jika format default ini berbeda.
    const res = await fetch('https://app.xsender.id/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: process.env.XSENDER_USER,
        password: process.env.XSENDER_PASS,
        to: formattedNumber,
        message: message,
      }),
    });

    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send WA message via xsender:', error);
    return { success: false, error };
  }
}
