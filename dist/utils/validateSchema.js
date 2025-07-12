import Ajv from 'ajv';
import schema from '../data/reality_check_report.schema.json' with { type: 'json' };
const ajv = new Ajv();
const validate = ajv.compile(schema);
export function validateReport(report) {
    return validate(report);
}
