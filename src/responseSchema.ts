/**
 * 個別書籍のID
 * https://techbookfest.org/product/${DatabaseId} としてアクセス可能
 */
export type DatabaseId = string;

type BookShelfItemId = string;
type OrganizationId = string;
type ImageId = string;

type fileName = string;
type ProductDownloadContentId = string;
type MarketHandshakeId = string;

/**
 * 書籍一覧画面のレスポンス (読み込み中の状態)
 */
export type GetMeViewerQueryResponse = {
  data: {
    viewer: {
      id: string;
      email: string;
      staff: boolean;
      __typename: string;
    };
  };
};

/**
 * 書籍一覧画面のレスポンス (読み込み完了の状態)
 * ページネーションの状態は pageInfo.hasNextPage で判定
 */
export type BookShelfQueryResponse = {
  data: {
    viewer: {
      id: string;
      bookShelfItems: BookShelfItemConnection;
      __typename: "User";
    };
  };
};

type BookShelfItemConnection = {
  pageInfo: PageInfoWithNext | PageInfoInEnd;
  edges: BookShelfItemEdge[];
  __typename: "BookShelfItemConnection";
};

type PageInfoWithNext = {
  hasNextPage: true;
  endCursor: string;
  __typename: "PageInfo";
};

type PageInfoInEnd = {
  hasNextPage: false;
  endCursor: "";
  __typename: "PageInfo";
};

type BookShelfItemEdge = {
  node: {
    id: `BookShelfItem:${BookShelfItemId}`; // 例: BookShelfItem:7168VYamRb85TvAtCFQ53G
    product: ProductInfo;
    __typename: "BookShelfItem";
  };
  cursor: string;
  __typename: "BookShelfItemEdge";
};

/**
 * 書籍情報
 */
type ProductInfo = {
  id: `ProductInfo:${DatabaseId}`; // 例: ProductInfo:hSRz7Ks1gD7NPgR8NTkpPL
  databaseID: DatabaseId; // 例: hSRz7Ks1gD7NPgR8NTkpPL
  name: string; //書名
  organization: {
    id: `Organization:${OrganizationId}`; // 例: Organization:6gGjVu7a1FCQB52CAGy2jT;
    name: string; //サークル名
    __typename: "Organization";
  };
  coverImage: {
    id: `Image:${ImageId}`; // 例: Image:9ci77PjKkwt6TPeb4qyENC
    url: `/api/image/${ImageId}.png`;
    height: number;
    width: number;
    __typename: "Image";
  };
  __typename: "ProductInfo";
};

/**
 * 書籍一覧画面にて書籍をクリックした際のレスポンス
 */
export type BookShelfItemDetailQueryResponse = {
  data: {
    node: {
      id: `BookShelfItem:${BookShelfItemId}`;
      cause: "MARKET" | "EVENT"; // 現地購入なら"EVENT"、オンラインマーケット購入なら"MARKET"
      causedAt: string; //ISO 8601形式の購入日時
      product: ProductInfo & { downloadContent: ProductDownloadContent };
      marketHandshake: MarketHandshake;
      __typename: "BookShelfItem";
    };
  };
};

/**
 * ダウンロードコンテンツの情報
 */
type ProductDownloadContent = {
  id: `ProductDownloadContent:${ProductDownloadContentId}`;
  fileName: `${fileName}.pdf`;
  downloadURL: `/api/product-dlc/${ProductDownloadContentId}/download`;
  __typename: "ProductDownloadContent";
};

type MarketHandshake = {
  id: `MarketHandshake:${MarketHandshakeId}`; // 例: MarketHandshake:6gGjVu7a1FCQB52CAGy2jT
  event: null | {
    id: `Event:${string}`; // 例: Event:tbf18
    name: string; // 例: "技術書典18"
    __typename: "Event";
  };
  __typename: "MarketHandshake";
};
