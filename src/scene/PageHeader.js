import {GridColumn, GridRow, Header} from "semantic-ui-react";
import React, {Fragment} from "react";

export const PageHeader = (props) => {
  return <Fragment>
    <GridRow columns={3}>
      <GridColumn floated={"left"} width={10}>
        <Header
          as="h1"
          content="Interactive 3D visualization of intracranial brain activity"
          floated="left"
          subheader="Built with create-react-app and three.js"
          style={{margin: "10px"}}/>
      </GridColumn>
      <GridColumn floated={"right"} width={1}>
        <a href={"http://www.neuro.cs.ut.ee"} target="_blank" rel="noreferrer noopener">
          <img src={"CompNeurosciLogo.png"} height={80} alt={"UT Computational Neuroscience department logo"}/>
        </a>
      </GridColumn>
      <GridColumn floated={"right"} width={1}>
        <a href={"http://www.ut.ee"} target="_blank" rel="noreferrer noopener">
          <img src={"UOTLogo.png"} height={80} alt={"Tartu University logo"}/>
        </a>
      </GridColumn>
    </GridRow>
  </Fragment>;
};
