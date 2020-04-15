/* eslint-disable */
// TODO: Since this is a general utility, locate it in a more general area.
import oboe from 'oboe';

// See: https://github.com/microsoft/TypeScript/issues/20595#issuecomment-587297818
const postMessage = ((self as unknown) as Worker).postMessage;

let isFetching = false;
onmessage = function({ data }) {
  if (isFetching) {
    throw new Error('Worker is already fetching data!');
  }

  const { url, path = 'data.*', limit = 100000, chunkSize = 10000, hasObjectResponse = false } = data;
  isFetching = true;

  let nodes: any = hasObjectResponse ? {} : [];
  let numNodes = 0;

  // Important to use oboe 2.1.4!! 2.1.5 can't be used in web workers!
  oboe(url)
    .node(path, function(node, _path) {
      numNodes++;

      if (hasObjectResponse) {
        nodes[_path[_path.length - 1]] = node;
      } else {
        nodes.push(node);
      }

      if (nodes.length % chunkSize === 0) {
        postMessage(nodes);
        nodes = hasObjectResponse ? {} : [];
      }

      if (numNodes > limit) {
        postMessage(nodes);
        // @ts-ignore
        this.abort();
        postMessage('DONE');
        return oboe.drop;
      }

      // Since we stream chunks, we don't need oboe to build an object.
      // Reduces RAM use dramatically!
      return oboe.drop;
    })
    .fail(error => {
      throw error;
    })
    .done(() => postMessage('DONE'));
};
