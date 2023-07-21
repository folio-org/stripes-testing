import {
  Button,
  ListItem,
  Section,
  including,
  NavListItem,
  TextArea,
  Select,
  MultiSelect,
  RadioButton,
  Accordion,
  TextField,
  FieldSet,
  Spinner,
} from "../../../../interactors";
import eHoldingsProviderView from "./eHoldingsProviderView";

import TopMenu from "../topMenu";
import eHoldingsProvidersSearch from "./eHoldingsProvidersSearch";
import eholdingsPackagesSearch from "./eHoldingsPackagesSearch";
import dateTools from "../../utils/dateTools";
import eHoldingsSearch from "./eHoldingsSearch";

const resultSection = Section({ id: "search-results" });
const desc = TextArea({ name: "description" });
const SaveAndClose = Button("Save & close");
const editButton = Button("Edit");
const actionsButton = Button("Actions");
const searchButton = Button("Search");
const alternativesTitles =
  "//div[text()='Alternate title(s)']/following-sibling::div";
const packageList = Section({ id: "packageShowTitles" });
const noteTitleXpath = "//div[text()='Subjects']/following-sibling::div";

const selectionStatusSection = Section({ id: "filter-packages-selected" });

const RandomValue = Math.floor(Math.random() * 3) + 1;

const availableProxies = ["Inherited - None", "FOLIO-Bugfest", "EZProxy"];

const proxySelect = Select({ id: "eholdings-proxy-id" });
const selectionStatusAccordion = Accordion({
  id: "accordion-toggle-button-filter-packages-selected",
});

export default {
  waitLoading: () => {
    cy.expect(
      resultSection
        .find(
          ListItem({ className: including("list-item-"), index: 1 }).find(
            Button()
          )
        )
        .exists()
    );
  },
  viewProvider: (rowNumber = 0) => {
    cy.do(
      resultSection
        .find(
          ListItem({ className: including("list-item-"), index: rowNumber })
        )
        .find(Button())
        .click()
    );
    eHoldingsProviderView.waitLoading();
  },
  editSchedule({ data }) {
    cy.do([
      NavListItem(data.name).click(),
      Button("Actions").click(),
      Button("Edit").click(),
      desc.fillIn(data.description),
      SaveAndClose.click(),
    ]);
  },
  proxyChange() {},
  PackageAccordianClick() {
    cy.do([
      Button({
        id: "accordion-toggle-button-providerShowProviderList",
      }).click(),
    ]);
  },
  PackageButtonClick(name) {
    cy.do([Button(name).click()]);
  },

  SwitchToPackage() {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider("JSTOR");
    eholdingsPackagesSearch.bySelectionStatus("Selected");
  },

  SwitchToPackageandsearch() {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsProvidersSearch.byProvider("Wiley Online Library");
    eholdingsPackagesSearch.bySelectionStatus("Selected");
  },

  editactions() {
    cy.wait(2000);
    cy.do([actionsButton.click(), editButton.click()]);
  },

  alternativesTitles: () => {
    cy.do([
      cy.xpath(alternativesTitles).then((value) => {
        cy.log(value.text());
      }),
    ]);
  },
  searchActions() {
    cy.do(searchButton.click());
  },

  patronRadiobutton: () => {
    cy.do([
      FieldSet("Show titles in package to patrons")
        .find(RadioButton({ checked: false }))
        .click(),
    ]);
  },

  changeProxy: () => {
    cy.do(proxySelect.choose(availableProxies[RandomValue]));
    // return cy.then(() => proxySelect.value())
    //     .then(selectedProxy => {
    //         const notSelectedProxy = availableProxies.filter(availableProxy => availableProxy.toLowerCase() !== selectedProxy)[RandomValue];
    //         cy.do(proxySelect.choose(notSelectedProxy));
    //         cy.expect(proxySelect.find(HTML(including(notSelectedProxy))).exists());
    //         return cy.wrap(notSelectedProxy);
    //     });
  },

  editDateRange: () => {
    cy.do([
      TextField({ id: "begin-coverage-0" }).fillIn(
        dateTools.getRandomStartDate(RandomValue)
      ),
      TextField({ id: "end-coverage-0" }).fillIn(
        dateTools.getRandomEndDate(RandomValue)
      ),
      Button("Save & close").click(),
    ]);
  },

  radioButtonclick(title) {
    cy.do([cy.xpath(title).click({ force: true })]);
  },

  DropdownValuesSelect(names) {
    cy.do(MultiSelect().select(names));
  },
  bySelectionStatus(selectionStatus) {
    cy.do(selectionStatusAccordion.clickHeader());
    cy.do(selectionStatusAccordion.find(RadioButton(selectionStatus)).click());
    cy.do(Button("Search").click());
  },

  clickSearchTitles: (rowNumber = 0) => {
    let str;
    cy.do(
      packageList
        .find(
          ListItem({ className: including("list-item-"), index: rowNumber })
        )
        .find(Button())
        .click()
    );
    cy.xpath(noteTitleXpath).then((val) => {
      str = val.text();
      cy.log(str);
    });
  },
  titlesSearch: () => {
    cy.expect(Button({ icon: "search" }).exists());
    cy.do(Button({ icon: "search" }).click());
    cy.expect(TextField({ id: "eholdings-search" }).exists());
    cy.do([
      TextField({ id: "eholdings-search" }).fillIn("engineering"),
      searchButton.click(),
    ]);
  },

  viewPackage: (rowNumber = 0) => {
    cy.expect(Spinner().absent);
    cy.do(
      resultSection
        .find(
          ListItem({ className: including("list-item-"), index: rowNumber })
        )
        .find(Button())
        .click()
    );
  },
  bySelectionStatusOpen(selectionStatus) {
    cy.do(selectionStatusSection.find(Button("Selection status")).click());
    cy.do(selectionStatusSection.find(RadioButton(selectionStatus)).click());
    cy.do(Button("Search").click());
  },
  SwitchTopackage() {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingsProvidersSearch.byProvider("Gale Cengage");
  },
};
