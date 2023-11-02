import { Section, KeyValue } from '../../../../interactors';
import dateTools from '../../utils/dateTools';

export default {
  mainLibraryLocation: 'Main Library',
  onlineLibraryLocation: 'Online',

  verifyOrderDateOpened: () => {
    cy.do(
      Section({ id: 'purchaseOrder' })
        .find(KeyValue('Date opened'))
        .perform((element) => {
          const rawDate = element.innerText;
          const parsedDate = Date.parse(
            rawDate.match(/\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{1,2}\s\w{2}/gm)[0],
          );
          // For local run it needs to add 18000000
          // The time on the server and the time on the yuai differ by 3 hours. It was experimentally found that it is necessary to add 18000000 sec
          dateTools.verifyDate(parsedDate, 18000000);
        }),
    );
  },
};
