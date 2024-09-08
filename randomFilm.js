
async function fetchMovieData(endpoint, additionalPath = '', page = 1) {
  const apiKey = process.env.NEXT_API_MOVIE_KEY;
  const url = `https://api.themoviedb.org/3/movie/${endpoint}${additionalPath}?language=en-US&page=${page}`;

  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  };

  const res = await fetch(url, options);

  if (!res.ok) {
    console.error('Не удалось получить данные:', res.status, res.statusText);
    throw new Error('Failed to fetch data');
  }

  return res.json();
}

async function getRandomMovie() {
  const arrApi = ['popular', 'top_rated'];
  const getRandomNum = (max) => {
    return Math.floor(Math.random() * max);
  };

  const category = arrApi[getRandomNum(arrApi.length)];
  const randomPage = getRandomNum(480);
  try {
    const result = await fetchMovieData(category, '', randomPage);
    if (result && result.results.length > 0) {
      // const randomMovie = result.results[getRandomNum(result.results.length)];
      // console.log(randomMovie);
      return result;
    }
  } catch (error) {
    console.error('Error in getRandomMovie function:', error);
  }
}

module.exports = { getRandomMovie };
