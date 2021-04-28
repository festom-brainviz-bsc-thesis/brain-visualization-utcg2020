import React, {Fragment} from "react";
import {Button, Grid, GridColumn, Header, Segment, Select} from "semantic-ui-react";
import {momentToMs} from "../helpers/Utility";
import {Slider} from "react-semantic-ui-range";

const sidebarDescription = "This tool allows you to upload human brain recording data in a generic format along with " +
    "anatomical (MNI) locations of the electrodes. Once uploaded you will be able to interact with your data. We hope" +
    " this visual tool is helpful for understanding the data you have and maybe make some discoveries! Please follow " +
    "the data format specified below.";
/*
const sidebarDescription = "This visualization allows to you to interactively explore human brain data recorded with " +
    "deep intracranial probes (electrodes, implanted inside test subjects' brains as shown on the x-ray image below)" +
    ".\n";
 */
const sidebarProgressTimeDescription = "As you progress through time (using the \"Time\" slider) you will see how " +
    "how the activity changes.\n";
const sidebarCategoryDescription = "You can choose the stimulus category the neural reaction to which " +
    "you would like to explore:\n";

const creditsText = "Implemented by Fedor Stomakhin at the Institute of Computer Science of University of Tartu, 2021";

const getCategorySelectOptions = (labels, categoryCount) => {
  if (labels.length === 0) {
    return [...Array(categoryCount).keys()].map((i) => ({key: i, text: i, value: i}));
  } else {
    return labels.map((l, i) => ({key: l, text: l, value: i}));
  }
};

const SubCategorySelectSettings = (props) => {
  const {hooks, displaySettings, categoryLabels, categoryCount} = props;
  const options = getCategorySelectOptions(categoryLabels, categoryCount);
  return (
    <Fragment>
      {categoryCount !== 0 &&
        <Grid columns={4} style={{margin: "0.5rem"}}>
          {options.map(({key, text, value}) =>
            <GridColumn
              key={key}
              width={4}
              style={{
                padding: "0rem",
              }}>
              <Button
                style={{padding: "0rem"}}
                fluid
                positive={displaySettings.category === value}
                onClick={() => hooks.toggleCategory(value)}>
                <p>{text}</p>
              </Button>
            </GridColumn>)}
        </Grid>
      }
    </Fragment>
  );
};

export const PageSidebar = (props) => {
  let {displaySettings, playing, hooks, updateMoment, slider, brainOpacity, brainGyriNames,
    categoryLabels, categoryCount} = props;


  const lobeToName = (lobe) => {
    const half = lobe.startsWith("lh") ? "Left - " : "Right - ";
    let name = lobe.split("DKT")[1];
    name = name.charAt(0).toUpperCase() + name.slice(1);
    return half + name;
  };

  if (displaySettings && hooks) {
    return <Fragment>
      <p style={{"textAlign": "left"}}>{sidebarDescription}</p>
      {props.children}
      <p style={{"textAlign": "left"}}>{sidebarProgressTimeDescription}</p>
      {categoryCount !== 0 && <p style={{"textAlign": "left"}}>{sidebarCategoryDescription}</p> }
      {categoryCount !== 0 && <Segment vertical>
        <SubCategorySelectSettings
          hooks={hooks}
          displaySettings={displaySettings}
          categoryLabels={categoryLabels}
          categoryCount={categoryCount}/>
      </Segment>}
      <Segment vertical>
        <Header>Time: {momentToMs(displaySettings.moment, displaySettings.maxMoment)}</Header>
        <Slider
          /* eslint-disable no-unused-vars */
          ref={(r) => slider = r}
          value={displaySettings.moment}
          discrete
          color="red"
          settings={{
            start: 0,
            min: 0,
            max: displaySettings.maxMoment,
            step: 1,
            onChange: updateMoment,
          }}
        />
        <Button.Group>
          <Button
            disabled={displaySettings.moment === 0 || playing}
            labelPosition='left'
            icon='left chevron'
            content='Previous'
            onClick={hooks.timeBackward} />
          <Button
            icon={playing ? "pause" : "play"}
            content={playing ? "Pause" : "Play"}
            onClick={hooks.togglePlayPause}/>
          <Button
            icon='undo'
            content='Reset'
            onClick={() => {
              hooks.resetTime();
              slider.setState({position: 0}); // visual hack, otherwise slider won't reset properly
            }}/>
          <Button
            disabled={displaySettings.moment === displaySettings.maxMoment || playing}
            labelPosition='right'
            icon='right chevron'
            content='Next'
            onClick={hooks.timeForward} />
        </Button.Group>
      </Segment>
      <Segment vertical>
        <Header>Brain opacity: {brainOpacity}</Header>
        <Slider
          value={brainOpacity}
          color="red"
          settings={{
            start: 0.4,
            min: 0.0,
            max: 1.0,
            step: 0.025,
            onChange: hooks.updateBrainOpacity,
          }}
        />
      </Segment>
      <Segment vertical>
        <Header>Brain lobes: </Header>
        <Select
          search
          multiple
          options={brainGyriNames?.map((name) => ({key: name, value: name, text: lobeToName(name)}))}
          onChange={hooks.selectGyri}
        />
      </Segment>
      <br/>
      <p style={{"textAlign": "left"}}>{creditsText}</p>
    </Fragment>;
  } else {
    return <div/>;
  }
};
