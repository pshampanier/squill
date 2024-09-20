import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import Alert from "@/components/core/Alert";
import StarIcon from "@/icons/star.svg?react";

export default function AlertPreview() {
  return (
    <>
      {/*
       * Severity variants
       */}
      <Preview>
        <Preview.Title>Severity</Preview.Title>
        <Preview.Description>
          Alerts have 4 possible severities: <b>message</b> (default), <b>info</b>, <b>success</b>, <b>warning</b> and{" "}
          <b>danger</b>.
        </Preview.Description>
        <PreviewBox>
          <Alert severity="message">
            <b>Message!</b>&nbsp;This is a message.
          </Alert>
          <Alert severity="info">
            <b>Info!</b>&nbsp;This is a message.
          </Alert>
          <Alert severity="success">
            <b>Success!</b>&nbsp;This is a message.
          </Alert>
          <Alert severity="warning">
            <b>Warning!</b>&nbsp;This is a message.
          </Alert>
          <Alert severity="danger">
            <b>Danger!</b>&nbsp;This is a message.
          </Alert>
        </PreviewBox>
      </Preview>
      {/*
       * Dismissible
       */}
      <Preview>
        <Preview.Title>Dismiss button</Preview.Title>
        <Preview.Description>
          By setting the <b>onDismiss</b> prop, an alert can be dismissed.
        </Preview.Description>
        <PreviewBox>
          <Alert severity="message" onDismiss={() => {}}>
            <b>Message!</b>&nbsp;This is a message.
          </Alert>
        </PreviewBox>
      </Preview>
      {/*
       * Title
       */}
      <Preview>
        <Preview.Title>Title</Preview.Title>
        <Preview.Description>
          Title can be set to <b>true</b> to display a default title (e.g., the severity of the message), or to a{" "}
          <b>string</b> to display a custom title.
        </Preview.Description>
        <PreviewBox>
          <Alert severity="info" title="Important">
            This is a message with a custom title based on a string.
          </Alert>
          <Alert severity="danger" title={true}>
            This is a message with a default title based on the severity.
          </Alert>
        </PreviewBox>
      </Preview>
      {/*
       * Icon
       */}
      <Preview>
        <Preview.Title>Icons</Preview.Title>
        <Preview.Description>
          Default icons can be added using <kbd>{"icon={true}"}</kbd> or using a custom icon.
        </Preview.Description>
        <PreviewBox>
          <Alert severity="message" icon={true} onDismiss={() => {}}>
            This is a message with the default Message icon.
          </Alert>
          <Alert severity="info" icon={true} onDismiss={() => {}}>
            This is a message with the default Info icon.
          </Alert>
          <Alert severity="success" icon={true} onDismiss={() => {}}>
            This is a message with the default Success icon.
          </Alert>
          <Alert severity="warning" icon={true} onDismiss={() => {}}>
            This is a message with the default Warning icon.
          </Alert>
          <Alert severity="danger" icon={true} onDismiss={() => {}}>
            This is a message with the default Danger icon.
          </Alert>
          <Alert severity="danger" icon={StarIcon} onDismiss={() => {}}>
            This is a message with a custom icon.
          </Alert>
        </PreviewBox>
      </Preview>
      {/*
       * Borders
       */}
      <Preview>
        <Preview.Title>Borders</Preview.Title>
        <Preview.Description>
          Alerts can have a border with <kbd>border=&quot;outline&quot;</kbd>.
        </Preview.Description>
        <PreviewBox>
          <Alert severity="message" border="outline">
            <b>Message!</b>&nbsp;This is a message.
          </Alert>
          <Alert severity="info" border="outline">
            <b>Info!</b>&nbsp;This is a message.
          </Alert>
          <Alert severity="success" border="outline">
            <b>Success!</b>&nbsp;This is a message.
          </Alert>
          <Alert severity="warning" border="outline">
            <b>Warning!</b>&nbsp;This is a message.
          </Alert>
          <Alert severity="danger" border="outline">
            <b>Danger!</b>&nbsp;This is a message.
          </Alert>
        </PreviewBox>
        <Preview.Description>
          Alerts can have an accent border with <kbd>border=&quot;accent&quot;</kbd>.
        </Preview.Description>
        <PreviewBox>
          <Alert severity="message" border="accent">
            <b>Message!</b>&nbsp;This is a message.
          </Alert>
          <Alert severity="info" border="accent">
            <b>Info!</b>&nbsp;This is a message.
          </Alert>
          <Alert severity="success" border="accent">
            <b>Success!</b>&nbsp;This is a message.
          </Alert>
          <Alert severity="warning" border="accent">
            <b>Warning!</b>&nbsp;This is a message.
          </Alert>
          <Alert severity="danger" border="accent">
            <b>Danger!</b>&nbsp;This is a message.
          </Alert>
        </PreviewBox>
      </Preview>
    </>
  );
}
