export const ORGANIZATION_INTEGRATION_CONFIG = {
  EXPORT_TYPES: {
    CLAIMS: 'CLAIMS',
    EDIFACT_ORDERS: 'EDIFACT_ORDERS_EXPORT',
  },
  FTP_CONNECTION_MODES: {
    ACTIVE: 'Active',
    PASSIVE: 'Passive',
  },
  FTP_MODES: {
    ASCII: 'ASCII',
    BINARY: 'Binary',
  },
  INTEGRATION_TYPES: {
    ORDERING: 'Ordering',
    CLAIMING: 'Claiming',
  },
  TRANSMISSION_METHODS: {
    FTP: 'FTP',
    FILE_DOWNLOAD: 'File download',
  },
  FILE_FORMATS: {
    EDI: 'EDI',
    CSV: 'CSV',
  },
  SCHEDULE_PERIODS: {
    HOUR: 'HOUR',
    DAY: 'DAY',
    WEEK: 'WEEK',
    NONE: 'NONE',
  },
  WEEK_DAYS: {
    SUNDAY: 'SUNDAY',
    MONDAY: 'MONDAY',
    TUESDAY: 'TUESDAY',
    WEDNESDAY: 'WEDNESDAY',
    THURSDAY: 'THURSDAY',
    FRIDAY: 'FRIDAY',
    SATURDAY: 'SATURDAY',
  },
  DEFAULT_ORDERS_DIRECTORY: '/ftp/files/orders',
  DEFAULT_FTP_PORT: 22,
  DEFAULT_FTP_SERVER_ADDRESS: 'sftp://ftp.ci.folio.org',
};

export const ORGANIZATION_INTEGRATION_FIELD_LABELS = {
  DATE: 'Date',
  DESCRIPTION: 'Description',
  EDI_FTP: 'EDI FTP',
  FILE_FORMAT: 'File format',
  FTP_CONNECTION_MODE: 'FTP connection mode',
  FTP_MODE: 'FTP mode',
  FTP_PORT: 'FTP port',
  INTEGRATION_NAME: 'Integration name',
  INTEGRATION_TYPE: 'Integration type',
  LIBRARY_EDI_CODE: 'Library EDI code',
  ORDER_DIRECTORY: 'Order directory',
  PASSWORD: 'Password',
  SCHEDULE_EDI: 'Schedule EDI',
  SCHEDULE_FREQUENCY: 'Schedule frequency',
  SCHEDULE_PERIOD: 'Schedule period',
  SERVER_ADDRESS: 'Server address',
  TIME: 'Time',
  TRANSMISSION_METHOD: 'Transmission method',
  USERNAME: 'Username',
  VENDOR_EDI_CODE: 'Vendor EDI code',
};
