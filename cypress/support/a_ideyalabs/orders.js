import { Button, Checkbox, Modal, PaneContent, Section } from "../../../interactors";


const ordersTab =  Button('Orders');
const ordersPane = PaneContent({id:"orders-filters-pane-content"});
const statusDropDown = Button('Status')
const openCheckBox = Checkbox('Open')
const pONumber = link("21211");
const actionsBtn = Button('Actions');
const ordersSection = Section({id: "order-details"});
const reExportBtn = Button("Re-export");
const reExportModal = Modal({id:"reexport-order-confirm-modal"})
const confirmButton = Button('Confirm');

export default{
    switchToOrders:()=>{
        cy.do(ordersPane.find(ordersTab).click())
    },
    status:()=>{
        cy.do([ordersPane.find(statusDropDown).click(),
        openCheckBox.click()]); 
    },
    poNumberRecord:()=>{
        cy.xpath(pONumber).click();
    },

    reExportActions() {
        cy.do(ordersSection.find(actionsBtn).click());
        cy.xpath(reExportBtn).click();
    },

    reExportOrderModal: ()=>{
        cy.do(reExportModal.find(confirmButton).click())
    }

}