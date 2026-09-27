export type TweetUser = {
  id_str: string;
  name: string;
  screen_name: string;
  profile_image_url_https: string;
  verified: boolean;
  is_blue_verified: boolean;
};

export type TweetData = {
  id_str: string;
  text: string;
  user: TweetUser;
};
