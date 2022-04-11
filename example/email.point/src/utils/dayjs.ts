import dayjs from 'dayjs';
import customParserFormat from 'dayjs/plugin/customParseFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import localeData from 'dayjs/plugin/localeData';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(relativeTime);
dayjs.extend(customParserFormat);
dayjs.extend(advancedFormat);
dayjs.extend(localeData);
dayjs.extend(utc);
dayjs.extend(isBetween);
dayjs.extend(timezone);

export default dayjs;
