// server/utils/notifications.js
// High-level notifications for alerts

const { sendEmail } = require('./email');
const { fromMgdL } = require('../utils/helpers');

/**
 * Send emails when an alert is triggered due to more than 3 abnormal readings.
 * It sends:
 *  - one email to the patient (if patient.email exists)
 *  - one email to the specialist (if specialist.email exists)
 */
async function sendAbnormalReadingAlertEmails({ patient, specialist, reading, alert, thresholds }) {
  try {
    const unit = patient?.preferredUnit || 'mg/dL';
    const numeric = fromMgdL(reading.valueMgPerdL, unit);
    const displayValue = typeof numeric === 'number'
      ? numeric.toFixed(1)
      : numeric;

    const timestamp = reading.recordedAt;

    const patientName = patient?.fullName || 'patient';
    const specialistName = specialist?.fullName || 'specialist';

    const baseSubject = 'Blood Sugar Alert - Multiple abnormal readings';

    const patientBody =
      `Hello ${patientName},\n\n` +
      `Our system detected more than 3 abnormal blood sugar readings in the last 7 days.\n` +
      `The latest reading was ${displayValue} ${unit} recorded at ${timestamp}.\n\n` +
      `Please follow your care plan and contact your care team if you feel unwell.\n\n` +
      `This message was sent automatically by the Blood Sugar Monitoring System.`;

    if (patient?.email) {
      await sendEmail(patient.email, baseSubject, patientBody);
    } else {
      console.warn('Patient email missing. Skipping patient email for alert', alert.id);
    }

    // Specialist email, if we know who that is and have an email
    if (specialist?.email) {
      const specialistBody =
        `Hello ${specialistName},\n\n` +
        `Patient ${patientName} (ID ${patient?.id}) has recorded more than 3 abnormal\n` +
        `blood sugar readings within the past 7 days.\n\n` +
        `Latest reading: ${displayValue} ${unit}\n` +
        `Recorded at: ${timestamp}\n` +
        `Alert ID: ${alert.id}\n\n` +
        `This message was sent automatically by the Blood Sugar Monitoring System.`;

      await sendEmail(specialist.email, baseSubject, specialistBody);
    } else {
      console.warn('Specialist email missing. Skipping specialist email for alert', alert.id);
    }

  } catch (err) {
    console.error('sendAbnormalReadingAlertEmails error:', err);
  }
}

module.exports = {
  sendAbnormalReadingAlertEmails
};
