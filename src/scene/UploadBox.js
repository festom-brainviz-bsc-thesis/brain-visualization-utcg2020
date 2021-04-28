import React, {useEffect, useState} from "react";
import {Button, Form, Header, Label, Message, Segment} from "semantic-ui-react";
import NumpyLoader from "../helpers/readnpy";
import {preprocessNpy} from "../helpers/Utility";

const UploadBox = ({target, label, description, onNpyFileRead}) => {
  const [file, setFile] = useState(null);
  const [statusMsg, setStatusMsg] = useState("Selected");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  }, [file]);

  const fileInputRef = React.createRef();

  const getNpyData = () => {
    return new Promise((res, rej) => {
      NumpyLoader.open(file, (o) => res(preprocessNpy(o).tolist()));
    });
  };

  const onFormSubmit = (e) => {
    e.preventDefault(); // Stop form submit
    if (file !== null) {
      setLoading(true);
      getNpyData().then((data) => {
        onNpyFileRead(target, data);
        setStatusMsg("Uploaded");
        setLoading(false);
      });
    }
  };

  const fileChange = (e) => {
    setFile(e.target.files[0]);
    setStatusMsg("Selected");
  };

  const getUploadForm = () => {
    return (
      <Form>
        <Form.Field>
          <Label>{statusMsg}: {file ? file.name : null}</Label>
          <Button
            content="Select file..."
            labelPosition="left"
            icon="file"
            onClick={() => fileInputRef.current.click()}
          />
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={fileChange}
          />
          <Button
            type="submit"
            value="Submit"
            disabled={loading}
            onClick={onFormSubmit}>
                        Upload
          </Button>
        </Form.Field>
      </Form>
    );
  };

  return (
    <main>
      <Segment horizontal>
        <Header>{label}</Header>
        <Message>{description}</Message>
        {getUploadForm()}
      </Segment>
    </main>
  );
};

export default UploadBox;
