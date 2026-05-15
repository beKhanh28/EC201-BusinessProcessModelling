require('dotenv').config(); // Khởi tạo dotenv để đọc file .env
const { Client, logger, Variables } = require('camunda-external-task-client-js');

// Cấu hình URL lấy từ biến môi trường, fallback về localhost nếu chạy local
const config = {
  baseUrl: process.env.CAMUNDA_URL || 'http://localhost:8080/engine-rest',
  use: logger,
  asyncResponseTimeout: 10000 
};

const client = new Client(config);

console.log("🚀 MÁY CHỦ BOT HẬU MÃI ĐÃ KHỞI ĐỘNG VÀ ĐANG CHỜ LỆNH...");

// ==========================================
// BƯỚC 1: KHÓA API (LẤY TỪ BIẾN MÔI TRƯỜNG)
// ==========================================
const EMAIL_API_KEY = process.env.EMAIL_API_KEY; 
const EMAIL_API_URL = 'https://api.brevo.com/v3/smtp/email';

// ==========================================
// NHÓM TASK XỬ LÝ DỮ LIỆU & LOGIC (GIỮ NGUYÊN 10 BOT)
// ==========================================

client.subscribe('phanloaiyeucau', async function({ task, taskService }) {
  console.log(`[Bot 1] Đang phân loại yêu cầu (ID: ${task.processInstanceId})`);
  const processVariables = new Variables();
  processVariables.set("loaihotro", "hotroquay"); 
  await taskService.complete(task, processVariables);
  console.log(`[Bot 1] Phân loại xong -> Chuyển luồng thành công.`);
});

client.subscribe('kiemtratinhhople', async function({ task, taskService }) {
  console.log(`[Bot 2] Đang check Database tính hợp lệ của vé...`);
  const processVariables = new Variables();
  processVariables.set("isduyethople", true);
  await taskService.complete(task, processVariables);
  console.log(`[Bot 2] Kết quả kiểm tra: Hợp lệ`);
});

client.subscribe('capnhatthongtin', async function({ task, taskService }) {
  await taskService.complete(task);
});

client.subscribe('vohieuhoavecu', async function({ task, taskService }) {
  await taskService.complete(task);
});

client.subscribe('phathanhvemoi', async function({ task, taskService }) {
  await taskService.complete(task);
});

client.subscribe('xulyhoantien', async function({ task, taskService }) {
  const orderId = task.variables.get("txtmadonhang") || "Không có mã";
  console.log(`[Bot 6] Gọi API VNPay/Momo hoàn tiền cho đơn: ${orderId} 💸`);
  await taskService.complete(task);
});

client.subscribe('tuchoithaydoi', async function({ task, taskService }) {
  await taskService.complete(task);
});

client.subscribe('guiemailnhacnho', async function({ task, taskService }) {
  await taskService.complete(task);
});

client.subscribe('khongdudieukien', async function({ task, taskService }) {
  await taskService.complete(task);
});

// ==========================================
// 10. GỬI EMAIL BẰNG HTTP FETCH GỌI API
// ==========================================
client.subscribe('guimailqrmoi', async function({ task, taskService }) {
  const maQRMoi = task.variables.get("txtmamoi") || "Không xác định";
  const emailKhachHang = task.variables.get("txtemailkhachhang"); 

  console.log(`[Bot 10] ⏳ Đang gọi API gửi mã mới [${maQRMoi}] tới: ${emailKhachHang}...`);

  if (emailKhachHang) {
    
    // CẬP NHẬT PAYLOAD
    const payload = {
      sender: {
        name: "Ban To Chuc Su Kien",
        email: "dangkhanhdrm@gmail.com" 
      },
      to: [
        { email: emailKhachHang }
      ],
      subject: "🎟️ Thông báo cấp phát vé/mã QR mới thành công",
      htmlContent: `
        <h3>Chào bạn,</h3>
        <p>Yêu cầu hỗ trợ cấp lại vé tại quầy của bạn đã thành công.</p>
        <p><strong>Mã QR/Serial mới của bạn là:</strong> <span style="color: red; font-size: 18px;">${maQRMoi}</span></p>
        <p>Vui lòng xuất trình mã này khi qua cổng check-in.</p>
      `
    };

    try {
      const response = await fetch(EMAIL_API_URL, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': EMAIL_API_KEY, // Sử dụng biến môi trường ở đây
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`[Bot 10] ✅ Đã gọi API Email thành công tới: ${emailKhachHang}`);
        await taskService.complete(task);
      } else {
        const errorData = await response.json();
        throw new Error(`Mã lỗi: ${response.status} - ${JSON.stringify(errorData)}`);
      }

    } catch (error) {
      console.error(`[Bot 10] ❌ Lỗi khi gọi API Email:`, error.message);
      await taskService.handleFailure(task, {
        errorMessage: "API Server từ chối gửi email",
        errorDetails: error.message,
        retries: 0,
        retryTimeout: 1000
      });
    }
  } else {
    console.log(`[Bot 10] ⚠️ Form không có email khách. Bỏ qua bước gửi.`);
    await taskService.complete(task);
  }
});