export const ORGANIZATION_INTEGRATION_CONFIG = {
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
