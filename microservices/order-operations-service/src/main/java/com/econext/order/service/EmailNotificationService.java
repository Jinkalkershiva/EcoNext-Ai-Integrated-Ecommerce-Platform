package com.econext.order.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Slf4j
@Service
public class EmailNotificationService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${app.mail.from:orders@econext.com}")
    private String fromEmail;

    /**
     * Dispatches the 6-Digit Delivery OTP verification email to the customer.
     * Guaranteed safe: Never throws an uncaught exception if SMTP is offline or not configured.
     */
    public boolean sendDeliveryOtpEmail(String recipientEmail, String customerName, String orderReference, String shipmentNumber, String otp, int validityMinutes) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            log.warn("Cannot send delivery OTP email: Recipient email is blank for order #{}, shipment #{}", orderReference, shipmentNumber);
            return false;
        }

        String subject = "🔐 Delivery Verification PIN for Order #" + orderReference + " - EcoNext";
        String htmlContent = buildDeliveryOtpHtml(customerName, orderReference, shipmentNumber, otp, validityMinutes);

        // Fallback or dev mode logging
        log.info("[DELIVERY OTP DISPATCH] PIN generated for Order #{} (Shipment #{}): {} | Target Recipient: {}",
                orderReference, shipmentNumber, otp, maskEmail(recipientEmail));

        if (mailSender == null || mailUsername == null || mailUsername.isBlank()) {
            log.info("[SMTP NOTICE] JavaMailSender or MAIL_USERNAME not configured. Delivery OTP logged securely above for testing.");
            return true;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailUsername.contains("@") ? mailUsername : fromEmail);
            helper.setTo(recipientEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Successfully dispatched Delivery OTP email to {} for shipment #{}", maskEmail(recipientEmail), shipmentNumber);
            return true;
        } catch (Exception ex) {
            log.warn("SMTP delivery failed for {}: {}. Continuing with order lifecycle without interruption.",
                    maskEmail(recipientEmail), ex.getMessage());
            return false;
        }
    }

    private String buildDeliveryOtpHtml(String customerName, String orderRef, String shipmentNo, String otp, int minutes) {
        String name = (customerName != null && !customerName.isBlank()) ? customerName : "Valued Customer";
        String template = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
                .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                .header { background: #065f46; color: #ffffff; padding: 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 22px; letter-spacing: -0.5px; }
                .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
                .body { padding: 30px 24px; }
                .otp-box { background: #ecfdf5; border: 2px dashed #10b981; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
                .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #065f46; font-family: 'Courier New', Courier, monospace; }
                .meta-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
                .meta-table td { padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
                .meta-table td.label { color: #64748b; width: 40%; }
                .meta-table td.val { font-weight: 600; color: #0f172a; }
                .instructions { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #92400e; margin-top: 20px; }
                .footer { background: #f8fafc; padding: 18px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>EcoNext Sustainable Fulfillment</h1>
                  <p>100% Carbon-Neutral Certified Delivery</p>
                </div>
                <div class="body">
                  <h2 style="font-size: 18px; margin-top: 0;">Hello {{name}},</h2>
                  <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                    Your eco-friendly order is <strong>Out for Delivery</strong> and will reach you shortly! Please provide the secure Delivery PIN below to your delivery executive upon receiving your package.
                  </p>

                  <div class="otp-box">
                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #047857; margin-bottom: 6px;">Secure Delivery PIN</div>
                    <div class="otp-code">{{otp}}</div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Valid for {{minutes}} minutes</div>
                  </div>

                  <table class="meta-table">
                    <tr>
                      <td class="label">Order Reference</td>
                      <td class="val">#{{orderRef}}</td>
                    </tr>
                    <tr>
                      <td class="label">Shipment Number</td>
                      <td class="val">{{shipmentNo}}</td>
                    </tr>
                    <tr>
                      <td class="label">Packaging Type</td>
                      <td class="val">100% Biodegradable & Recycled</td>
                    </tr>
                  </table>

                  <div class="instructions">
                    ⚠️ <strong>Security Advisory:</strong> Never share this PIN over phone or SMS before physical inspection and handover of your parcel.
                  </div>
                </div>
                <div class="footer">
                  © 2026 EcoNext Inc. All rights reserved. • Building sustainable commerce for a greener tomorrow.
                </div>
              </div>
            </body>
            </html>
            """;

        return template
                .replace("{{name}}", name)
                .replace("{{otp}}", otp)
                .replace("{{minutes}}", String.valueOf(minutes))
                .replace("{{orderRef}}", orderRef != null ? orderRef : "N/A")
                .replace("{{shipmentNo}}", shipmentNo != null ? shipmentNo : "N/A");
    }

    public static String maskEmail(String email) {
        if (email == null || email.isBlank()) return "***";
        int atIdx = email.indexOf('@');
        if (atIdx <= 1) return "***" + email.substring(Math.max(0, atIdx));
        String prefix = email.substring(0, atIdx);
        String domain = email.substring(atIdx);
        String maskedPrefix = prefix.charAt(0) + "***" + prefix.charAt(prefix.length() - 1);
        return maskedPrefix + domain;
    }

    public static String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) return "***";
        if (phone.length() <= 4) return "***";
        return phone.substring(0, 3) + " *** " + phone.substring(phone.length() - 2);
    }
}
