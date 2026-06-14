import api from './api';

export const aiService = {
  // #9 Reschedule suggestions
  async getRescheduleSuggestions(appointmentId: string) {
    const r = await api.get(`/ai/appointments/${appointmentId}/reschedule-suggestions`);
    return r.data;
  },

  // #10 Appointment summary
  async getAppointmentSummary(appointmentId: string) {
    const r = await api.get(`/ai/appointments/${appointmentId}/summary`);
    return r.data;
  },

  // #12 Next booking prediction
  async getNextBookingPrediction() {
    const r = await api.get('/ai/recommendations/next-booking');
    return r.data;
  },

  // #15 Provider match score
  async getProviderMatchScore(providerId: string) {
    const r = await api.get(`/ai/providers/${providerId}/match-score`);
    return r.data;
  },

  // #21 Personalised recommendations
  async getPersonalisedRecommendations() {
    const r = await api.get('/ai/recommendations/providers');
    return r.data;
  },

  // #22 Smart search
  async smartSearchProviders(query: string) {
    const r = await api.get('/ai/providers/smart-search', { params: { q: query } });
    return r.data;
  },

  // #23 Review summary
  async getReviewSummary(providerId: string) {
    const r = await api.get(`/ai/providers/${providerId}/review-summary`);
    return r.data;
  },

  // #24 Provider FAQ
  async askProviderQuestion(providerId: string, question: string) {
    const r = await api.post(`/ai/providers/${providerId}/ask`, { question });
    return r.data;
  },

  // #26 Follow-up suggestions
  async getFollowupSuggestions(appointmentId: string) {
    const r = await api.get(`/ai/appointments/${appointmentId}/followup-suggestions`);
    return r.data;
  },

  // #28 Fraud alerts (admin)
  async getFraudAlerts() {
    const r = await api.get('/ai/admin/fraud-alerts');
    return r.data;
  },

  // #29 Revenue forecast (admin)
  async getRevenueForecast() {
    const r = await api.get('/ai/admin/revenue-forecast');
    return r.data;
  },

  // #30 Churn risk (admin)
  async getChurnRisk() {
    const r = await api.get('/ai/admin/churn-risk');
    return r.data;
  },

  // #33 Supply demand gaps (admin)
  async getSupplyDemandGaps() {
    const r = await api.get('/ai/admin/supply-demand-gaps');
    return r.data;
  },

  // #38 Auto reply
  async getAutoReply(providerId: string, message: string) {
    const r = await api.post(`/ai/providers/${providerId}/auto-reply`, { question: message });
    return r.data;
  },

  // #46 Trust score
  async getProviderTrustScore(providerId: string) {
    const r = await api.get(`/ai/providers/${providerId}/trust-score`);
    return r.data;
  },

  // #48 Trend explanation (admin)
  async getTrendExplanation(period: 'week' | 'month' = 'week') {
    const r = await api.get('/ai/admin/trend-explanation', { params: { period } });
    return r.data;
  },

  // #49 Earnings insights (provider)
  async getEarningsInsights() {
    const r = await api.get('/ai/providers/me/earnings-insights');
    return r.data;
  },

  // #50 Lifetime value (admin)
  async getCustomerLifetimeValue(userId: string) {
    const r = await api.get(`/ai/admin/users/${userId}/lifetime-value`);
    return r.data;
  },

  // #54 Category suggester
  async suggestCategory(specialization: string) {
    const r = await api.get('/ai/suggest-category', { params: { specialization } });
    return r.data;
  },

  // #11 Conflict check
  async checkConflict(appointment_date: string, start_time: string, end_time: string) {
    const r = await api.get('/ai/appointments/conflict-check', { params: { appointment_date, start_time, end_time } });
    return r.data;
  },

  // #14 Duration estimator
  async estimateDuration(category_id: string) {
    const r = await api.get('/ai/availability/estimate-duration', { params: { category_id } });
    return r.data;
  },

  // #27 Budget estimator
  async getBudgetEstimate() {
    const r = await api.get('/ai/customers/budget-estimate');
    return r.data;
  },
};
