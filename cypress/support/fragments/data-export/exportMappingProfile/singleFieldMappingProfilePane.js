import { including } from "bigtest";
import {
  Accordion,
  PaneHeader,
  MultiColumnListCell,
  KeyValue
} from "../../../../../interactors";

export default {
  clickProfileNameFromTheList(name) {
    cy.do(MultiColumnListCell(including(name)).click());
  },

  waitLoading(name) {
    cy.expect(PaneHeader(name).exists());
  },

  verifyProfileDetails(profileDetails) {
    cy.expect([
      KeyValue('Name').has({ value: profileDetails.name }),
      KeyValue('FOLIO record type').has({ value: profileDetails.recordType }),
      KeyValue('Output format').has({ value: profileDetails.outputFormat }),
      KeyValue('Description').has({ value: profileDetails.description }),
    ]);
    cy.expect(Accordion({ headline: 'Update information' }).has({ content: including(`Source: ${profileDetails.source}`) }));
  },
};