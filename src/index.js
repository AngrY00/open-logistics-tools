'use strict';

const hsCodes = require('./hsCodes');
const bdDutyModule = require('./bdDuty');

module.exports = {
  // HS code utilities
  ...hsCodes,
  // Bangladesh duty calculator (bdDuty function + tti + parseAssessableValue)
  ...bdDutyModule,
  // Named sub-module access (kept separate so they don't shadow the functions)
  hsCodes,
  bdDutyModule,
};